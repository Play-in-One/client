/* eslint-disable @next/next/no-img-element -- the decoded card image, at its natural ratio. */
import { Badge, Box, Container, Group, Stack, Text, Title } from '@mantine/core';
import SkeletonLine from '@/components/skeleton/SkeletonLine';
import type { PostSeed } from '@/lib/navigationSeed';
import { formatDate } from '@/lib/seo';

/**
 * La cabecera de un artículo con lo que su tarjeta sabía: categoría, título,
 * fecha e imagen, con el MISMO marcado que `BlogPostClient` (Container `md`,
 * `py="section"`, los mismos márgenes). Solo la usa el overlay instantáneo: el
 * artículo no tiene `loading.tsx` (sus 404 y 308 deben ser reales), así que el
 * overlay se queda hasta que llega la página entera, que pinta lo mismo en el
 * mismo sitio.
 *
 * La imagen es la que la tarjeta ya tenía decodificada: con su proporción
 * natural, igual que la `Image` del artículo, que no fija alto.
 */
export default function PostHeaderSkeleton({ seed }: { seed: PostSeed }) {
    const src = seed.placeholderSrc ?? seed.image;
    return (
        <Container size="md" py="section">
            <Group justify="space-between" mb="md">
                <Badge color="primaryRed">{seed.categoryLabel}</Badge>
            </Group>
            <Title order={1} mb="sm">{seed.title}</Title>
            <Text c="dimmed" mb="xl">
                <time dateTime={seed.date}>{formatDate(seed.date)}</time>
            </Text>
            {src && (
                <Box mb="xl" style={{ borderRadius: 'var(--mantine-radius-lg)', overflow: 'hidden' }}>
                    <img src={src} alt="" decoding="sync" style={{ display: 'block', width: '100%', objectFit: 'cover' }} />
                </Box>
            )}
            <Box className="content-card" p="xl">
                <Stack gap="md">
                    {[100, 96, 88, 100, 72].map((width, i) => (
                        <Text key={i} component="div"><SkeletonLine width={`${width}%`} /></Text>
                    ))}
                </Stack>
            </Box>
        </Container>
    );
}
