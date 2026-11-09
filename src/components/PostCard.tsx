'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { Badge, Box, Card, Text } from '@mantine/core';
import { IconDeviceGamepad } from '@tabler/icons-react';
import RemoteImage from '@/components/RemoteImage';
import { trackEvent } from '@/lib/api';
import { seedFromClick } from '@/lib/navigationSeed';
import { CATEGORY_LABEL, postExcerpt } from '@/lib/postText';
import { formatDate, postPath } from '@/lib/seo';
import type { Post } from '@/lib/types';

/* `compact` es la de la home (rótulo en mayúsculas, imagen más baja en
   móvil, sin fecha); `full` la del listado del blog. Antes eran dos copias
   que ya habían divergido: la de la home era un `<a>` plano —cada clic
   recargaba la página entera— y la del blog un `<img>` sin optimizar. */
type Variant = 'compact' | 'full';

const IMAGE_HEIGHT = { compact: { base: 130, md: 180 }, full: 180 } as const;
const BODY_PADDING = { compact: { base: 'md', md: 'lg' }, full: 'lg' } as const;

/**
 * Tarjeta de una noticia. Enlaza con `<Link>` y precarga por defecto: el post
 * es ISR estático, así que precargarlo no le pide nada al backend y el clic
 * suele abrirlo ya completo. Si la precarga no alcanzó, la semilla (ver
 * `lib/navigationSeed.ts`) pinta en el clic la cabecera del artículo.
 */
export default function PostCard({ post, variant = 'full' }: { post: Post; variant?: Variant }) {
    const href = postPath(post);
    const label = CATEGORY_LABEL[post.category] ?? post.category;
    const onClick = (event: MouseEvent<HTMLElement>) => {
        trackEvent({ event_type: 'post_click', post: post.id });
        seedFromClick(event, {
            kind: 'post', id: post.id, title: post.title, image: post.image ?? null,
            category: post.category, categoryLabel: label, date: post.published_date,
        }, href);
    };
    return (
        <Card
            component={Link}
            href={href}
            shadow="sm"
            p={0}
            className="pio-lift"
            style={{ overflow: 'hidden', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            onClick={onClick}
            data-post-card
        >
            <Box
                h={IMAGE_HEIGHT[variant]}
                bg="light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}
            >
                {post.image ? (
                    <RemoteImage src={post.image} alt={post.title} sizes="(max-width: 992px) 100vw, 380px"
                        style={{ objectFit: 'cover' }} />
                ) : (
                    <IconDeviceGamepad size={48} color="var(--mantine-color-dimmed)" />
                )}
            </Box>
            <Box p={BODY_PADDING[variant]}>
                {variant === 'compact' ? (
                    <Text fz={{ base: 10, md: 'xs' }} fw={700} c="var(--pio-brand-text)" tt="uppercase" mb={{ base: 4, md: 6 }} style={{ letterSpacing: 1 }}>
                        {label}
                    </Text>
                ) : (
                    <Badge color="primaryRed" mb="sm">{label}</Badge>
                )}
                <Text fw={700} fz={variant === 'compact' ? { base: 'sm', md: 'lg' } : 'lg'}
                    mb={variant === 'compact' ? { base: 4, md: 6 } : 'xs'} lineClamp={2}>{post.title}</Text>
                {/* El cuerpo es Markdown: la tarjeta muestra el resumen en texto
                    plano, el mismo de la meta description. */}
                <Text fz={variant === 'compact' ? { base: 'xs', md: 'sm' } : 'sm'} c="dimmed" lineClamp={3}>{postExcerpt(post.description)}</Text>
                {variant === 'full' && (
                    <Text fz="xs" c="dimmed" mt="md" component="time" dateTime={post.published_date}>
                        {formatDate(post.published_date)}
                    </Text>
                )}
            </Box>
        </Card>
    );
}
