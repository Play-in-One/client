import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Box, Container, Stack, Text, Title } from '@mantine/core';
import { getGames, getSaga } from '@/lib/api';
import type { Game, SagaDetail } from '@/lib/types';
import { surfaces } from '@/lib/colors';
import FeaturedGamesCarousel from '@/components/FeaturedGamesCarousel';
import SagaLogo from '@/components/SagaLogo';
import GameExplorer from '@/components/game-explorer/GameExplorer';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, breadcrumbJsonLd, collectionPageJsonLd, itemListJsonLd } from '@/lib/seo';

const ORDERING = 'min_price';
const PAGE_SIZE = 24;

// El listado de una saga cambia con el catálogo (precios, stock); 5 min lo
// mantiene fresco sin pagar el fetch en cada visita.
export const revalidate = 300;

// Vacío a propósito: sin `generateStaticParams` Next trata la ruta como
// dinámica e ignora `revalidate` (cada visita pagaría el fetch, `no-store`).
// Con la lista vacía nada se prerenderiza en el build y cada saga se cachea
// tras su primera visita.
export function generateStaticParams(): { slug: string }[] {
    return [];
}

async function fetchSaga(slug: string): Promise<SagaDetail | null> {
    try {
        return await getSaga(slug);
    } catch {
        return null;
    }
}

/** Juegos de la saga, ya filtrados/anotados (mismo camino que la galería:
 *  `GET /api/games/?saga=<slug>`). Reemplaza al `games` que traía el
 *  detalle de saga antes de que se retirara por colar juegos ocultos. */
async function fetchGames(slug: string): Promise<{ games: Game[]; total: number }> {
    try {
        const res = await getGames({ saga: slug, ordering: ORDERING });
        return { games: res.results, total: res.count };
    } catch {
        return { games: [], total: 0 };
    }
}

function sagaSummary(saga: SagaDetail, total: number): string {
    const label = total === 1 ? '1 juego' : `${total} juegos`;
    return `Comparamos ${label} de la saga ${saga.name} entre tiendas chilenas, con precios actualizados a diario.`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const saga = await fetchSaga(slug);
    if (!saga) return buildMetadata({ title: 'Saga no encontrada', noIndex: true });
    const { total } = await fetchGames(slug);

    return buildMetadata({
        title: `Juegos de ${saga.name}: precios en Chile`,
        description: sagaSummary(saga, total),
        path: `/saga/${saga.slug}`,
        image: saga.logo || undefined,
    });
}

/** Cabecera centrada: logo + nombre, sobre el banner (si existe) como fondo. */
function SagaHero({ saga }: { saga: SagaDetail }) {
    const heading = (
        <Stack align="center" gap="xs">
            {saga.logo && <SagaLogo saga={saga} scale={1.5} priority />}
            <Title order={1} fz={{ base: 28, md: 36 }} fw={800} ta="center" c={saga.banner ? 'white' : undefined}>
                {saga.name}
            </Title>
        </Stack>
    );

    if (!saga.banner) {
        return <Box mb="sm">{heading}</Box>;
    }

    return (
        <Box style={{ position: 'relative', height: 220, overflow: 'hidden' }} mb="lg">
            <Image src={saga.banner} alt="" fill style={{ objectFit: 'cover' }} priority />
            <Box
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.6))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {heading}
            </Box>
        </Box>
    );
}

export default async function SagaDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const saga = await fetchSaga(slug);
    if (!saga) notFound();

    const { games, total } = await fetchGames(slug);
    const summary = sagaSummary(saga, total);
    const path = `/saga/${saga.slug}`;

    const jsonLd = [
        collectionPageJsonLd({ name: `Juegos de ${saga.name}`, description: summary, path }),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Sagas', path: '/sagas' },
            { name: saga.name, path },
        ]),
        ...(games.length ? [itemListJsonLd(games, { path, name: `Juegos de ${saga.name}` })] : []),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <SagaHero saga={saga} />
            <Container size="xl" pt="xl">
                <Text c="dimmed" ta="center">
                    {summary}
                </Text>
            </Container>

            {/* Misma sección que "Juegos Destacados" del home (banda, ancho `lg`
                para el que está pensado el carrusel, y títulos). */}
            {saga.featured_games.length > 0 && (
                <Box py={60} mt="xl" style={{ background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTint})` }}>
                    <Container size="lg">
                        <Box mb="xl">
                            <Title order={2} fz={{ base: 24, md: 30 }} fw={700}>
                                Destacados de {saga.name}
                            </Title>
                            <Text c="dimmed" mt={6}>
                                Selección del equipo PIO.
                            </Text>
                        </Box>
                        <FeaturedGamesCarousel games={saga.featured_games} />
                    </Container>
                </Box>
            )}

            <Container size="xl" py="xl">
                {games.length > 0 ? (
                    <>
                        <Title order={2} fz="xl" fw={700} mb="md">
                            Todos los juegos
                        </Title>
                        {/* Sin `staticFallback`: a diferencia de /juegos/<slug> (el camino
                            de rastreo del catálogo completo), esta ficha no necesita HTML
                            100% estático — arranca directo en modo interactivo, con la
                            paginación real de GameExplorer visible desde el primer render
                            (antes, la grilla estática mostraba solo la página 1 sin forma
                            de ver el resto hasta tocar un filtro). */}
                        <GameExplorer
                            lockedSaga={{ slug: saga.slug, name: saga.name }}
                            initialGames={games}
                            initialTotal={total}
                            pageSize={PAGE_SIZE}
                            defaultOrdering={ORDERING}
                            showHeader={false}
                            withContainer={false}
                        />
                    </>
                ) : (
                    <Text c="dimmed">Todavía no hay juegos con oferta disponible en esta saga.</Text>
                )}
            </Container>
        </>
    );
}
