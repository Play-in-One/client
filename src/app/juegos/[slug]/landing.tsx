import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Anchor, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { getGames, getPlatforms } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import GameCard from '@/components/GameCard';
import CrawlablePagination from '@/components/CrawlablePagination';
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
 * El cuerpo compartido de la landing por consola, para que `/juegos/ps5` y
 * `/juegos/ps5/pagina/2` sean literalmente la misma página con otro número.
 *
 * La paginación no es cosmética: es el ÚNICO camino por el que un crawler puede
 * recorrer el catálogo. Antes cada landing servía 24 fichas y su único "ver
 * más" apuntaba a `/search?platform=…`, que es `noindex` — un callejón sin
 * salida. Con ~10.000 juegos, eso dejaba al 96% sin ningún enlace entrante.
 */

const ORDERING = 'min_price';

/** Lo que devuelve una página de la API (`PAGE_SIZE` de DRF, en settings.py). */
export const PAGE_SIZE = 24;

/** La página 1 vive en la landing limpia; nunca en `/pagina/1`. */
export function landingPath(slug: string, page: number): string {
    return page <= 1 ? `/juegos/${slug}` : `/juegos/${slug}/pagina/${page}`;
}

async function fetchPlatform(slug: string): Promise<Platform | null> {
    try {
        const res = await getPlatforms();
        return res.results.find((p) => p.slug === slug) ?? null;
    } catch {
        return null;
    }
}

async function fetchGames(
    platform: Platform,
    page: number,
): Promise<{ games: Game[]; total: number }> {
    try {
        const res = await getGames({ platforms: [platform.id], ordering: ORDERING, page });
        return { games: res.results, total: res.count };
    } catch {
        // Incluye el 404 que devuelve DRF cuando se pide una página fuera de
        // rango. El llamador distingue ese caso por `games.length === 0`.
        return { games: [], total: 0 };
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

/**
 * El resumen de una página interior. Es distinto del de la landing a propósito:
 * repetir el mismo párrafo en las ~50 páginas de una consola las convertiría en
 * duplicados entre sí, que es justo lo que hace que Google deje de indexarlas.
 */
function pageSummary(platform: Platform, page: number, totalPages: number, total: number): string {
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    return (
        `Juegos de ${platform.display_name} del ${from} al ${to} de ` +
        `${total.toLocaleString('es-CL')}, ordenados del más barato al más caro. ` +
        `Página ${page} de ${totalPages}. Los precios están en pesos chilenos e ` +
        'incluyen el envío promedio de cada tienda.'
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

export async function buildLandingMetadata(slug: string, page: number): Promise<Metadata> {
    const platform = await fetchPlatform(slug);
    if (!platform) return buildMetadata({ title: 'Consola no encontrada', noIndex: true });

    const { games, total } = await fetchGames(platform, page);
    if (page > 1 && games.length === 0) {
        return buildMetadata({ title: 'Página no encontrada', noIndex: true });
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const base = `Juegos de ${platform.display_name} baratos en Chile`;
    return buildMetadata({
        title: page > 1 ? `${base} — página ${page} de ${totalPages}` : base,
        description:
            page > 1
                ? pageSummary(platform, page, totalPages, total)
                : platformSummary(platform, games, total),
        // Canonical autorreferente, NO apuntando a la página 1: una página
        // interior canonizada a la landing deja de indexarse y, con el tiempo,
        // Google también deja de seguir sus enlaces — que es lo único que
        // queríamos de ella.
        path: landingPath(platform.slug, page),
    });
}

export default async function PlatformLanding({ slug, page }: { slug: string; page: number }) {
    const platform = await fetchPlatform(slug);
    if (!platform) notFound();

    const { games, total } = await fetchGames(platform, page);
    // Más allá de la primera, una página sin resultados no existe: 404 en vez de
    // servir una página vacía que Google indexaría como contenido pobre.
    if (page > 1 && games.length === 0) notFound();

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const isFirst = page === 1;
    const path = landingPath(platform.slug, page);
    const heading = `Juegos de ${platform.display_name} baratos en Chile`;
    const summary = isFirst
        ? platformSummary(platform, games, total)
        : pageSummary(platform, page, totalPages, total);
    const faq = buildFaq(platform, games, total);

    const jsonLd = [
        collectionPageJsonLd({
            name: isFirst ? heading : `${heading} — página ${page}`,
            description: summary,
            path,
        }),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Juegos', path: '/search' },
            { name: platform.display_name, path: `/juegos/${platform.slug}` },
            ...(isFirst ? [] : [{ name: `Página ${page}`, path }]),
        ]),
        ...(games.length
            ? [
                itemListJsonLd(games, {
                    path,
                    name: isFirst
                        ? `Juegos de ${platform.display_name} más baratos`
                        : `Juegos de ${platform.display_name}, página ${page}`,
                }),
            ]
            : []),
        // El FAQPage va solo en la landing: las respuestas no cambian de una
        // página a otra, y repetir el mismo marcado en las ~50 páginas de una
        // consola es duplicación. La sección visible se omite con él, así que no
        // queda texto sin su dato estructurado.
        ...(isFirst ? [faqJsonLd(faq, path)] : []),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <Container size="xl" py="xl">
                <Title order={1} fz={{ base: 28, md: 36 }} fw={800} mb="sm">
                    {heading}
                    {!isFirst && (
                        <Text component="span" fz="inherit" fw="inherit" c="dimmed">
                            {' '}
                            — página {page}
                        </Text>
                    )}
                </Title>
                <Text c="dimmed" lh={1.6} maw={780} mb="lg">
                    {summary}
                </Text>

                {games.length > 0 ? (
                    <>
                        <Group justify="space-between" align="baseline" mb="md">
                            <Title order={2} fz="xl" fw={700}>
                                {isFirst ? 'Los más baratos ahora' : `Página ${page} de ${totalPages}`}
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
                        <CrawlablePagination
                            current={page}
                            total={totalPages}
                            hrefFor={(n) => landingPath(platform.slug, n)}
                        />
                    </>
                ) : (
                    <Text c="dimmed">
                        Ahora mismo no hay ofertas en stock para {platform.display_name}.
                    </Text>
                )}
            </Container>
            {isFirst && (
                <FaqSection
                    entries={faq}
                    title={`Preguntas frecuentes sobre juegos de ${platform.display_name}`}
                />
            )}
        </>
    );
}
