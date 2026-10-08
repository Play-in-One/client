import type { Metadata } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { notFound } from 'next/navigation';
import { Container, SimpleGrid, Text, Title } from '@mantine/core';
import { ApiError, getGames, getPlatforms } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import { platformLongName } from '@/lib/types';
import GameCard from '@/components/GameCard';
import CrawlablePagination from '@/components/CrawlablePagination';
import FaqSection from '@/components/FaqSection';
import { JsonLd } from '@/components/JsonLd';
import GameExplorer from '@/components/game-explorer/GameExplorer';
import {
    buildMetadata,
    breadcrumbJsonLd,
    collectionPageJsonLd,
    faqJsonLd,
    itemListJsonLd,
    type FaqEntry,
} from '@/lib/seo';

/**
 * El cuerpo compartido de la landing por consola, para que `/juegos/ps5` y
 * `/juegos/ps5/pagina/2` sean literalmente la misma página con otro número.
 *
 * La paginación no es cosmética: es el ÚNICO camino por el que un crawler puede
 * recorrer el catálogo. Antes cada landing servía 24 fichas y su único "ver
 * más" apuntaba a `/search?platform=…`, que es `noindex` — un callejón sin
 * salida. Con ~10.000 juegos, eso dejaba al 96% sin ningún enlace entrante.
 */

const ORDERING = '-traffic_score,name';

/** Lo que devuelve una página de la API (`PAGE_SIZE` de DRF, en settings.py). */
export const PAGE_SIZE = 24;

/** La página 1 vive en la landing limpia; nunca en `/pagina/1`. */
export function landingPath(slug: string, page: number): string {
    return page <= 1 ? `/juegos/${slug}` : `/juegos/${slug}/pagina/${page}`;
}

/**
 * Un fallo del backend (5xx, timeout, red) NO puede convertirse en una landing
 * vacía: con ISR esa versión se cachea 300 s, dice «comparamos 0 juegos» y sale
 * `noindex` (o un 404 si la consola "no existe"). Lanzar hace que Next siga
 * sirviendo la última versión buena y reintente en la próxima visita — misma
 * regla que la portada (`app/page.tsx`). En el build se degrada: ahí no hay
 * versión anterior que conservar y lanzar rompería el deploy.
 */
function rethrowOutsideBuild(error: unknown): void {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
}

async function fetchPlatform(slug: string): Promise<Platform | null> {
    try {
        const res = await getPlatforms();
        return res.results.find((p) => p.slug === slug) ?? null;
    } catch (error) {
        rethrowOutsideBuild(error);
        return null;
    }
}

/** `failed` solo es `true` en el build con el backend caído: el llamador no
 *  debe tratar esa página como "genuinamente vacía". */
async function fetchGames(
    platform: Platform,
    page: number,
): Promise<{ games: Game[]; total: number; failed: boolean }> {
    try {
        const res = await getGames({ platforms: [platform.id], ordering: ORDERING, page });
        return { games: res.results, total: res.count, failed: false };
    } catch (error) {
        // El 404 de DRF es una página fuera de rango: vacía de verdad. El
        // llamador lo distingue por `games.length === 0`.
        if (error instanceof ApiError && error.status === 404) {
            return { games: [], total: 0, failed: false };
        }
        rethrowOutsideBuild(error);
        return { games: [], total: 0, failed: true };
    }
}

/**
 * La frase citable de la consola. Mismo texto en el HTML y en la metadata.
 * No afirma cuál es el juego más barato: los juegos llegan ordenados por
 * popularidad, así que tomarlo de esta página sería falso.
 */
function platformSummary(platform: Platform, games: Game[], total: number): string {
    const sellers = new Set(
        games.map((g) => g.min_price_seller?.id).filter((id): id is number => id != null),
    );
    const head = `En Play in One comparamos ${total.toLocaleString('es-CL')} juegos de ${platformLongName(platform)} entre tiendas chilenas`;
    const where = sellers.size > 1 ? `, con ofertas en ${sellers.size} tiendas distintas` : '';
    return `${head}${where}. Todos los precios incluyen el envío promedio de la tienda y están en pesos chilenos.`;
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
        `Juegos de ${platformLongName(platform)} del ${from} al ${to} de ` +
        `${total.toLocaleString('es-CL')}, ordenados por popularidad. ` +
        `Página ${page} de ${totalPages}. Los precios están en pesos chilenos.`
    );
}

function buildFaq(platform: Platform, total: number): FaqEntry[] {
    const entries: FaqEntry[] = [];
    const name = platformLongName(platform);

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

    const { games, total, failed } = await fetchGames(platform, page);
    if (page > 1 && games.length === 0) {
        return buildMetadata({ title: 'Página no encontrada', noIndex: true });
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const base = `Juegos de ${platformLongName(platform)} baratos en Chile`;
    return buildMetadata({
        title: page > 1 ? `${base} — página ${page} de ${totalPages}` : base,
        description:
            page > 1
                ? pageSummary(platform, page, totalPages, total)
                : platformSummary(platform, games, total),
        // Las páginas interiores son `noindex, follow`: existen como camino de
        // rastreo hacia las fichas, no como páginas indexables (son listados
        // casi idénticos entre sí). Tampoco se indexa una landing sin juegos,
        // pero solo si está vacía DE VERDAD: un fallo del backend en el build
        // no debe dejarla `noindex` (se corrige en la siguiente regeneración).
        // El canonical sigue siendo autorreferente, NO apuntando a la página 1:
        // canonizar a la landing haría que Google dejara de seguir sus enlaces.
        path: landingPath(platform.slug, page),
        noIndex: page > 1 || (page === 1 && games.length === 0 && !failed),
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
    const heading = `Juegos de ${platformLongName(platform)} baratos en Chile`;
    const summary = isFirst
        ? platformSummary(platform, games, total)
        : pageSummary(platform, page, totalPages, total);
    const faq = buildFaq(platform, total);

    const jsonLd = [
        collectionPageJsonLd({
            name: isFirst ? heading : `${heading} — página ${page}`,
            description: summary,
            path,
        }),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Juegos', path: '/search' },
            { name: platformLongName(platform), path: `/juegos/${platform.slug}` },
            ...(isFirst ? [] : [{ name: `Página ${page}`, path }]),
        ]),
        ...(games.length
            ? [
                itemListJsonLd(games, {
                    path,
                    name: isFirst
                        ? `Juegos de ${platformLongName(platform)} más baratos`
                        : `Juegos de ${platformLongName(platform)}, página ${page}`,
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
                <Text component="p" c="dimmed" maw={760}>
                    {summary}
                </Text>

                {games.length > 0 ? (
                    <GameExplorer
                        lockedPlatform={{ id: platform.id, slug: platform.slug, display_name: platformLongName(platform) }}
                        initialGames={games}
                        initialTotal={total}
                        pageSize={PAGE_SIZE}
                        defaultOrdering={ORDERING}
                        showHeader={false}
                        withContainer={false}
                        staticFallback={
                            <>
                                <SimpleGrid cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing="md">
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
                        }
                    />
                ) : (
                    <Text c="dimmed">
                        Ahora mismo no hay ofertas en stock para {platformLongName(platform)}.
                    </Text>
                )}
            </Container>
            {isFirst && (
                <FaqSection
                    entries={faq}
                    title={`Preguntas frecuentes sobre juegos de ${platformLongName(platform)}`}
                    collapsible
                />
            )}
        </>
    );
}
