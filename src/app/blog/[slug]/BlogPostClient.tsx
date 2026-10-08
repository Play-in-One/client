'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Alert, Button, Container, Group, Title, Box, Text, Badge, Image } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { Post } from '@/lib/types';
import { trackEvent } from '@/lib/api';
import { useConsent } from '@/context/ConsentContext';
import { useAdmin } from '@/context/AdminContext';
import PostEditorModal from '@/components/PostEditorModal';
import { CATEGORY_LABEL } from '@/lib/postText';
import { formatDate } from '@/lib/seo';

const DAY_MS = 24 * 60 * 60 * 1000;

/* El cuerpo público llega ya renderizado por el servidor (`bodySlot`), así que
   el lector de Markdown no viaja en el bundle de la página. Solo hace falta en
   el navegador tras una edición de staff, y entonces se carga aparte: un
   import estático lo metería en el JS de cada visitante del blog. */
const PostBody = dynamic(() => import('@/components/PostBody'));

/** Solo una edición posterior al día de publicación merece el aviso: el
 *  `updated_at` de un post recién creado difiere de `published_date` en
 *  milisegundos, y una errata corregida esa misma tarde no es una novedad. */
function updatedAfterPublishing(post: Post): string | null {
    if (!post.updated_at) return null;
    const published = Date.parse(post.published_date);
    const updated = Date.parse(post.updated_at);
    if (Number.isNaN(published) || Number.isNaN(updated)) return null;
    return updated - published > DAY_MS ? post.updated_at : null;
}

export default function BlogPostClient({ initialPost, bodySlot }: {
    initialPost: Post;
    /** `<PostBody>` renderizado en el servidor: el cuerpo tiene que estar en el
     *  HTML inicial, que es lo único que leen los crawlers de IA. */
    bodySlot?: ReactNode;
}) {
    const { isAdmin } = useAdmin();
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [savedPost, setSavedPost] = useState<Post | null>(null);
    // La respuesta de la escritura se muestra incluso si la revalidación ISR
    // falla temporalmente. No se arrastra a otro artículo al navegar.
    const post = savedPost?.id === initialPost.id ? savedPost : initialPost;
    const edited = post !== initialPost;
    // Mide la lectura, no el click: cuenta también las llegadas por buscador o
    // link directo. El ref evita el doble disparo de StrictMode en dev.
    const trackedPostId = useRef<number | null>(null);
    // Igual que en la ficha de juego: sin esperar a `ready`, este efecto se
    // adelanta al de ConsentContext y el evento sale sin identificar y
    // saltándose el opt-out.
    const { ready } = useConsent();

    useEffect(() => {
        if (!ready || trackedPostId.current === post.id) return;
        trackedPostId.current = post.id;
        trackEvent({ event_type: 'post_view', post: post.id });
    }, [post.id, ready]);

    const updatedAt = updatedAfterPublishing(post);

    return (
        <Container size="md" py={60}>
            <Group justify="space-between" mb="md">
                <Badge color="primaryRed">{CATEGORY_LABEL[post.category] ?? post.category}</Badge>
                {isAdmin && (
                    <Button variant="light" leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>Editar post</Button>
                )}
            </Group>
            {edited && <Alert color="green" mb="lg" role="status">Cambios guardados.</Alert>}
            <Title order={1} mb="sm">{post.title}</Title>
            {/* La fecha se formatea con zona fija (America/Santiago): con
                `toLocaleDateString()` el HTML del servidor y el del navegador
                podían diferir en el día y romper la hidratación. */}
            <Text c="dimmed" mb="xl">
                <time dateTime={post.published_date}>{formatDate(post.published_date)}</time>
                {updatedAt && (
                    <>
                        {' · Actualizado el '}
                        <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
                    </>
                )}
            </Text>

            {post.image && (
                <Box mb="xl" style={{ borderRadius: 'var(--mantine-radius-lg)', overflow: 'hidden' }}>
                    <Image src={post.image} alt={post.title} width="100%" />
                </Box>
            )}

            <Box className="content-card" p="xl">
                {/* Tras guardar, el slot del servidor trae el texto VIEJO hasta
                    que llega el refresh: se pinta la respuesta de la escritura.
                    El bucle por líneas es solo el respaldo de quien monte el
                    componente sin slot. */}
                {edited ? (
                    <PostBody markdown={post.description} />
                ) : bodySlot ?? post.description.split('\n').map((paragraph, idx) => (
                    <Text key={idx} mb="md" style={{ whiteSpace: 'pre-wrap' }}>
                        {paragraph}
                    </Text>
                ))}
            </Box>
            {editing && (
                <PostEditorModal
                    key={post.id}
                    post={post}
                    onClose={() => setEditing(false)}
                    onSaved={(updated) => {
                        setSavedPost(updated);
                        setEditing(false);
                        router.refresh();
                    }}
                />
            )}
        </Container>
    );
}
