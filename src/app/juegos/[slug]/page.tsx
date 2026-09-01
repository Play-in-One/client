import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Anchor, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { getGames, getPlatforms } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import GameCard from '@/components/GameCard';
import FaqSection from '@/components/FaqSection';
import { JsonLd } from '@/components/JsonLd';
import {
    buildMetadata,
    breadcrumbJsonLd,
    collectionPageJsonLd,
    faqJsonLd,
    itemListJsonLd,
    type FaqEntry,
} from '@/lib/seo';
import { formatCLP } from '@/lib/utils';

/**
 * Landing por consola: /juegos/ps5, /juegos/switch, /juegos/pc…
 *
 * Existe porque `/search?platform=ps5` va `noindex` (cualquier permutación de
 * filtros lo está, para no indexar mil variantes del mismo catálogo) y además
 * se renderizaba entero en el cliente. Los enlaces de consola del Navbar y el
 * Footer apuntaban ahí, así que el sitio no tenía ni una página indexable para
 * "juegos de PS5 baratos" — que es la búsqueda real.
 *
 * La ruta es `/juegos/[slug]` y no `/consola/[slug]` porque así la URL contiene
 * la consulta ("juegos ps5") y porque `pc` no es una consola.
 */

const ORDERING = 'min_price';

export const revalidate = 300;

async function fetchPlatform(slug: string): Promise<Platform | null> {
    try {
        const res = await getPlatforms();
        return res.results.find((p) => p.slug === slug) ?? null;
    } catch {
        return null;
    }
}

async function fetchGames(platform: Platform): Promise<{ games: Game[]; total: number }> {
    try {
        const res = await getGames({ platforms: [platform.id], ordering: ORDERING });
        return { games: res.results, total: res.count };
    } catch {
        return { games: [], total: 0 };
    }
}

/** Prerenderiza una landing por consola. Son pocas y estables. */
export async function generateStaticParams() {
    try {
        const res = await getPlatforms();
        return res.results.map((p) => ({ slug: p.slug }));
    } catch {
        // Sin backend en el build no se prerenderiza ninguna: se generan
        // bajo demanda en la primera visita.
        return [];
    }
}

/** La frase citable de la consola. Mismo texto en el HTML y en la metadata. */
function platformSummary(platform: Platform, games: Game[], total: number): string {
    const cheapest = games.find((g) => g.min_price != null);
    const sellers = new Set(
        games.map((g) => g.min_price_seller?.id).filter((id): id is number => id != null),
    );
    const head = `En Play in One comparamos ${total.toLocaleString('es-CL')} juegos de ${platform.display_name} entre tiendas chilenas`;
    const where = sellers.size > 1 ? `, con ofertas en ${sellers.size} tiendas distintas` : '';
    if (!cheapest) return `${head}${where}.`;
    const seller = cheapest.min_price_seller ? ` en ${cheapest.min_price_seller.name}` : '';
    return (
        `${head}${where}. El juego de ${platform.display_name} más barato ahora es ` +
        `${cheapest.name} a ${formatCLP(cheapest.min_price!)}${seller}. ` +
        'Todos los precios están en pesos chilenos e incluyen el envío promedio de cada tienda.'
    );
}

function buildFaq(platform: Platform, games: Game[], total: number): FaqEntry[] {
    const entries: FaqEntry[] = [];
    const cheapest = games.find((g) => g.min_price != null);
    const name = platform.display_name;

    if (cheapest) {
        const seller = cheapest.min_price_seller ? ` en ${cheapest.min_price_seller.name}` : '';
        entries.push({
            question: `¿Cuál es el juego de ${name} más barato en Chile?`,
            answer: `${cheapest.name}, a ${formatCLP(cheapest.min_price!)}${seller}, envío promedio incluido.`,
        });
    }
    if (total > 0) {
        entries.push({
            question: `¿Cuántos juegos de ${name} se pueden comparar en Play in One?`,
            answer: `${total.toLocaleString('es-CL')} juegos de ${name} con al menos una oferta en stock. El catálogo se actualiza a diario.`,
        });
    }
    entries.push({
        question: `¿Los precios de ${name} incluyen el envío?`,
        answer:
            'Sí. Cada precio que se muestra es el de lista más el envío promedio de esa tienda, ' +
            'porque comparar una tienda con despacho gratis contra una importadora por su precio ' +
            'de lista favorecía sistemáticamente a la segunda. Los juegos digitales quedan exentos.',
    });
    return entries;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const platform = await fetchPlatform(slug);
    if (!platform) return buildMetadata({ title: 'Consola no encontrada', noIndex: true });

    const { games, total } = await fetchGames(platform);
    return buildMetadata({
        title: `Juegos de ${platform.display_name} baratos en Chile`,
        description: platformSummary(platform, games, total),
        path: `/juegos/${platform.slug}`,
    });
}

export default async function PlatformLandingPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const platform = await fetchPlatform(slug);
    if (!platform) notFound();

    const { games, total } = await fetchGames(platform);
    const summary = platformSummary(platform, games, total);
    const faq = buildFaq(platform, games, total);

    const jsonLd = [
        collectionPageJsonLd({
            name: `Juegos de ${platform.display_name} baratos en Chile`,
            description: summary,
            path: `/juegos/${platform.slug}`,
        }),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Juegos', path: '/search' },
            { name: platform.display_name, path: `/juegos/${platform.slug}` },
        ]),
        ...(games.length
            ? [
                itemListJsonLd(games, {
                    path: `/juegos/${platform.slug}`,
                    name: `Juegos de ${platform.display_name} más baratos`,
                }),
            ]
            : []),
        faqJsonLd(faq, `/juegos/${platform.slug}`),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <Container size="xl" py="xl">
                <Title order={1} fz={{ base: 28, md: 36 }} fw={800} mb="sm">
                    Juegos de {platform.display_name} baratos en Chile
                </Title>
                <Text c="dimmed" lh={1.6} maw={780} mb="lg">
                    {summary}
                </Text>

                {games.length > 0 ? (
                    <>
                        <Group justify="space-between" align="baseline" mb="md">
                            <Title order={2} fz="xl" fw={700}>
                                Los más baratos ahora
                            </Title>
                            <Anchor
                                component={Link}
                                href={`/search?platform=${platform.slug}`}
                                fz="sm"
                                c="primaryRed"
                                underline="hover"
                            >
                                Filtrar y ordenar el catálogo completo
                            </Anchor>
                        </Group>
                        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
                            {games.map((game, i) => (
                                <GameCard
                                    key={game.id}
                                    game={game}
                                    platformSlug={platform.slug}
                                    priority={i < 6}
                                />
                            ))}
                        </SimpleGrid>
                    </>
                ) : (
                    <Text c="dimmed">
                        Ahora mismo no hay ofertas en stock para {platform.display_name}.
                    </Text>
                )}
            </Container>
            <FaqSection
                entries={faq}
                title={`Preguntas frecuentes sobre juegos de ${platform.display_name}`}
            />
        </>
    );
}
