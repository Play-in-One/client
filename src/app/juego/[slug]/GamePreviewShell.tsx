import { Anchor, Badge, Box, Breadcrumbs, Card, Container, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import RemoteImage from '@/components/RemoteImage';
import type { GamePreview } from '@/lib/api';
import { gamePath } from '@/lib/seo';
import { platformLongName } from '@/lib/types';
import { formatCLP } from '@/lib/utils';
import { decorative, elevation, onDark } from '@/lib/colors';

/** Real first-frame content. Only the sections still pending use placeholders. */
export default function GamePreviewShell({ game, failed = false }: { game: GamePreview; failed?: boolean }) {
    const platform = game.platforms.find(p => p.slug === game.selected_platform);
    return <Container size="lg" py="xl" data-game-preview>
        <Breadcrumbs mb="xl" fz="sm">
            <Anchor href="/" c="dimmed">Inicio</Anchor>
            {platform && <Anchor href={`/juegos/${platform.slug}`} c="dimmed">{platformLongName(platform)}</Anchor>}
            <Text fw={500}>{game.name}</Text>
        </Breadcrumbs>
        <div className="pio-game-layout">
            <Box className="pio-game-cover">
                <Box pos="relative" maw={{ base: '85%', lg: '100%' }} mx={{ base: 'auto', lg: 0 }}
                    style={{ aspectRatio: '3/4', boxShadow: elevation.cover, borderRadius: 'var(--mantine-radius-lg)', overflow: 'hidden', border: '1px solid var(--mantine-color-default-border)' }}>
                    <RemoteImage src={game.image ?? null} alt={game.name} priority
                        sizes="(max-width: 768px) 30vw, (max-width: 1200px) 85vw, 380px" style={{ objectFit: 'cover' }} />
                </Box>
            </Box>
            <Card p="lg" className="pio-game-info"><Text fw={600}>Información del juego</Text></Card>
            <div className="pio-game-content">
                <Stack gap="xl" className="pio-game-stack">
                    <Box className="pio-game-title" style={{ marginBottom: -16 }}>
                        <Skeleton height={34} width={90} mb="2xs" radius="xl" />
                        <Title order={1} fz={{ base: 28, md: 36 }} fw={800} mb="sm">{game.name}</Title>
                        <Group gap="2xs" mb="sm" mih={38}>{game.platforms.map(p => <Badge key={p.id} variant={p.slug === game.selected_platform ? 'filled' : 'light'}>{p.display_name}</Badge>)}</Group>
                    </Box>
                    <Card p="xl" radius="lg" className="pio-game-best-price" data-game-preview-price style={{ minHeight: 200,
                        background: `linear-gradient(135deg, light-dark(${decorative.bestPriceCardGradient.light.from}, ${decorative.bestPriceCardGradient.dark.from}), light-dark(${decorative.bestPriceCardGradient.light.to}, ${decorative.bestPriceCardGradient.dark.to}))`,
                        color: onDark.text }}>
                        <Badge mb="sm">Mejor precio {game.selected_platform?.toUpperCase()}</Badge>
                        <Text fz="3xl" fw={800}>{game.min_price != null ? formatCLP(game.min_price) : 'Sin ofertas disponibles'}</Text>
                        {game.min_price_seller && <Text>{game.min_price_seller.name}</Text>}
                        {Number(game.min_price_shipping) > 0 && <Text size="xs">Incluye envío promedio</Text>}
                    </Card>
                    <Box>
                        <Text role="status" mb="md">{failed ? 'No pudimos cargar el resto de la ficha.' : 'Cargando ofertas y detalles…'}</Text>
                        {failed ? <Anchor href={gamePath(game, game.selected_platform ?? undefined)}>Reintentar</Anchor>
                            : <Skeleton height={280} radius="md" />}
                    </Box>
                </Stack>
            </div>
        </div>
    </Container>;
}
