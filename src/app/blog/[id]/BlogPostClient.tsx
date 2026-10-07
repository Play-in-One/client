'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Container, Group, Title, Box, Text, Badge, Image } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { Post } from '@/lib/types';
import { trackEvent } from '@/lib/api';
import { useConsent } from '@/context/ConsentContext';
import { useAdmin } from '@/context/AdminContext';
import PostEditorModal from '@/components/PostEditorModal';

export default function BlogPostClient({ initialPost }: { initialPost: Post }) {
    const { isAdmin } = useAdmin();
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [savedPost, setSavedPost] = useState<Post | null>(null);
    // La respuesta de la escritura se muestra incluso si la revalidación ISR
    // falla temporalmente. No se arrastra a otro artículo al navegar.
    const post = savedPost?.id === initialPost.id ? savedPost : initialPost;
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

    return (
        <Container size="md" py={60}>
            <Group justify="space-between" mb="md">
                <Badge color="primaryRed">{post.category}</Badge>
                {isAdmin && (
                    <Button variant="light" leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>Editar post</Button>
                )}
            </Group>
            {savedPost?.id === initialPost.id && <Alert color="green" mb="lg" role="status">Cambios guardados.</Alert>}
            <Title order={1} mb="sm">{post.title}</Title>
            <Text c="dimmed" mb="xl" component="time" dateTime={post.published_date}>
                {new Date(post.published_date).toLocaleDateString()}
            </Text>

            {post.image && (
                <Box mb="xl" style={{ borderRadius: 'var(--mantine-radius-lg)', overflow: 'hidden' }}>
                    <Image src={post.image} alt={post.title} width="100%" />
                </Box>
            )}

            <Box className="content-card" p="xl">
                {post.description.split('\n').map((paragraph, idx) => (
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
