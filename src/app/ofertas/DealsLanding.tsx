import type { Metadata } from 'next';
import Link from 'next/link';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { notFound } from 'next/navigation';
import { Anchor, Container, SimpleGrid, Text, Title } from '@mantine/core';
import GameExplorer from '@/components/game-explorer/GameExplorer';
import { ApiError, getDeals, getGames, getPlatforms } from '@/lib/api';
import type { DealsResponse, Game, Platform } from '@/lib/types';
import { platformLongName } from '@/lib/types';
import DealCard from '@/components/DealCard';
import CrawlablePagination from '@/components/CrawlablePagination';
import InfoHeading from '@/components/InfoHeading';
import { JsonLd } from '@/components/JsonLd';
import {
    DEALS_METHOD_LINE,
    DEALS_ORDERING,
    DEALS_PAGE_SIZE,
    DEALS_SCOPE_NOTE,
    DEALS_TYPICAL_NOTE,
    dealCardGame,
    dealFromGame,
    dealsPagePath,
    dealsRangeLabel,
    dealConsoleLinkLabel,
    dealConsoleChips,
    dealsPageView,
} from '@/lib/deals';
import {
    breadcrumbJsonLd,
    buildMetadata,
    collectionPageJsonLd,
    itemListJsonLd,
} from '@/lib/seo';

/**
 * Cuerpo compartido de `/ofertas` y `/ofertas/<consola>`. Server Component:
 * los datos se piden aquí y salen en el HTML, porque GPTBot y compañía no
 * ejecutan JavaScript y esta es la página con más intención de compra del
 * sitio («ofertas videojuegos Chile»).
 *
 * Las ofertas las calcula cada noche `build_daily_deals` sobre el catálogo
 * ENTERO y el comando revalida estas rutas al terminar; el `revalidate` de las
 * páginas es solo la red de seguridad.
 *
 * La grilla es la de las galerías de consola: `GameExplorer` con `lockedDeals`
 * y, de `staticFallback`, una página de `/api/games/?deals=1`. Un
 * crawler (sin JS) lee esas tarjetas; un visitante tiene además el sidebar de
 * filtros, y con sus preferencias globales (condición, ubicación de la tienda)
 * el explorador vuelve a pedir con `deals=1` en vez de mostrar la grilla sin
 * filtrar. Lo único que no sigue esas preferencias es el precio típico, y la
 * página lo dice (`DEALS_SCOPE_NOTE`).
 */

const EMPTY: DealsResponse = { date: null, last_scrape_at: null, count: 0, platforms: [], results: [] };

/**
 * Un fallo del backend no puede convertirse en una página vacía: con ISR esa
 * versión se cachearía con «Hoy no hay juegos…» y `noindex`. Lanzar hace que
 * Next siga sirviendo la última versión buena y reintente en la próxima visita
 * — misma regla que la portada y las landings por consola. En el build se
 * degrada: ahí no hay versión anterior que conservar y lanzar rompería el
 * deploy.
 */
function rethrowOutsideBuild(error: unknown): void {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
}

/** `platform`: `undefined` = sin consola (la página global); `null` = slug
 *  desconocido. `catalog` da nombre a los chips (`dealConsoleChips`). */
async function fetchPlatforms(slug?: string): Promise<{ platform: Platform | null | undefined; catalog: Platform[] }> {
    try {
        const { results } = await getPlatforms();
        return {
            platform: slug === undefined ? undefined : (results.find((p) => p.slug === slug) ?? null),
            catalog: results,
        };
    } catch (error) {
        // En la global el catálogo solo nombra chips: sin él, los nombres salen
        // de las tarjetas y la página no tiene por qué caerse. Con consola, sin
        // catálogo no se sabe si el slug existe: la regla de siempre.
        if (slug !== undefined) rethrowOutsideBuild(error);
        return { platform: slug === undefined ? undefined : null, catalog: [] };
    }
}

async function fetchPlatform(slug?: string): Promise<Platform | null | undefined> {
    return (await fetchPlatforms(slug)).platform;
}

/** `failed` solo es `true` en el build con el backend caído: esa página no es
 *  "genuinamente vacía" y no debe decir «Hoy no hay juegos…»; muestra un texto
 *  neutro (`DEALS_UNAVAILABLE`) y sale `noindex` hasta la próxima regeneración. */
async function fetchDeals(platform?: Platform): Promise<{ res: DealsResponse; failed: boolean }> {
    try {
        return { res: await getDeals({ platform: platform?.slug, revalidate: 3600 }), failed: false };
    } catch (error) {
        rethrowOutsideBuild(error);
        return { res: EMPTY, failed: true };
    }
}

async function fetchDealGames(platform: Platform | undefined, page: number): Promise<{ games: Game[]; total: number; failed: boolean }> {
    try {
        const res = await getGames({
            deals: 1, ordering: DEALS_ORDERING, page, page_size: DEALS_PAGE_SIZE,
            platforms: platform ? [platform.id] : undefined,
            revalidate: 3600,
        });
        return { games: res.results, total: res.count, failed: false };
    } catch (error) {
        if (page > 1 && error instanceof ApiError && error.status === 404) {
            return { games: [], total: 0, failed: false };
        }
        rethrowOutsideBuild(error);
        return { games: [], total: 0, failed: true };
    }
}

export function dealsPath(platform?: Platform | null, page = 1): string {
    return dealsPagePath(platform?.slug, page);
}

export async function buildDealsMetadata(slug?: string, page = 1): Promise<Metadata> {
    const platform = await fetchPlatform(slug);
    if (platform === null) return buildMetadata({ title: 'Consola no encontrada', noIndex: true });

    const [{ res, failed: summaryFailed }, { games, total, failed: gamesFailed }] = await Promise.all([
        fetchDeals(platform), fetchDealGames(platform, page),
    ]);
    const failed = summaryFailed || gamesFailed;
    if (page > 1 && games.length === 0 && !failed) {
        return buildMetadata({ title: 'Página no encontrada', noIndex: true });
    }
    // Las reglas de «hoy», el texto y el `noindex` viven en `dealsPageView`:
    // la página y su metadata tienen que decir lo mismo.
    const view = dealsPageView(res, { platform, failed });
    return buildMetadata({
        title: page > 1 ? `${view.heading} — página ${page}` : view.heading,
        // La misma frase que se lee bajo el H1: lo que cita un buscador tiene
        // que estar en la página.
        description: page > 1 ? `${dealsRangeLabel(page, total)}. ${DEALS_TYPICAL_NOTE}` : view.summary,
        path: dealsPath(platform, page),
        noIndex: page > 1 || view.noIndex,
    });
}

export default async function DealsLanding({ slug, page = 1 }: { slug?: string; page?: number }) {
    const { platform, catalog } = await fetchPlatforms(slug);
    // Página propia (sin `loading.tsx`): el 404 es un status real.
    if (platform === null) notFound();

    const [{ res, failed: summaryFailed }, { games, total, failed: gamesFailed }] = await Promise.all([
        fetchDeals(platform), fetchDealGames(platform, page),
    ]);
    const failed = summaryFailed || gamesFailed;
    if (page > 1 && games.length === 0 && !failed) notFound();
    const deals = games.flatMap((game) => {
        const deal = dealFromGame(game);
        return deal ? [deal] : [];
    });
    const path = dealsPath(platform, page);
    const totalPages = Math.max(1, Math.ceil(total / DEALS_PAGE_SIZE));
    // En el servidor, con el reloj de esta regeneración: «hoy» o «del <fecha>»
    // llega ya resuelto al HTML y a las tarjetas (`isToday`).
    const view = dealsPageView(res, { platform, failed });
    const heading = page > 1 ? `${view.heading} — página ${page}` : view.heading;
    const summary = page > 1 ? `${dealsRangeLabel(page, total)}. ${DEALS_TYPICAL_NOTE}` : view.summary;
    const { isToday } = view;
    // Todas las consolas con ofertas hoy y cuántos juegos tiene cada una
    // (`res.platforms`, la misma lista con o sin filtro), con la actual marcada.
    const consoles = dealConsoleChips(res, catalog);

    const jsonLd = [
        collectionPageJsonLd({ name: heading, description: summary, path }),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Ofertas', path: '/ofertas' },
            ...(platform ? [{ name: platformLongName(platform), path: dealsPath(platform) }] : []),
            ...(page > 1 ? [{ name: `Página ${page}`, path }] : []),
        ]),
        // El ItemList enumera exactamente las tarjetas visibles, sin precios:
        // la tarjeta no siempre conoce el desglose de la oferta (ver
        // `withOffers` en `itemListJsonLd`).
        ...(deals.length
            ? [itemListJsonLd(deals.map(dealCardGame), { path, name: heading, withOffers: false })]
            : []),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <Container size="xl" py="xl">
                {/* La frase resumen va tras la (i) del título, como el
                    resumen de las landings de consola: sigue en el HTML
                    inicial (y en la meta description) sin empujar las ofertas
                    hacia abajo. */}
                <InfoHeading
                    label="Resumen de las ofertas"
                    heading={
                        <Title order={1} fz={{ base: 28, md: 36 }} fw={800}>
                            {heading}
                        </Title>
                    }
                >
                    <Text component="p" m={0}>
                        {summary}
                    </Text>
                    {/* Los enlaces a cada `/ofertas/<consola>` viven aquí y no
                        en un selector visible: son el ÚNICO enlace interno a
                        esas páginas (el filtro «Plataforma» del explorador son
                        checkboxes, que un crawler no sigue). Dentro del
                        <details> siguen en el HTML inicial, así que quitarlos
                        de la vista no los deja huérfanos. */}
                    {consoles.length > 0 && (
                        <Text component="nav" aria-label="Ofertas por consola" fz="sm" mt="xs">
                            Ofertas por consola:{' '}
                            {platform && (
                                <>
                                    <Anchor component={Link} href="/ofertas" fz="sm">
                                        todas
                                    </Anchor>
                                    {' · '}
                                </>
                            )}
                            {consoles.map((chip, i) => {
                                const p = chip.platform;
                                const active = p.slug === platform?.slug;
                                return (
                                    <span key={p.slug}>
                                        {i > 0 && ' · '}
                                        <Anchor
                                            component={Link}
                                            href={`/ofertas/${p.slug}`}
                                            fz="sm"
                                            fw={active ? 700 : undefined}
                                            aria-current={active ? 'page' : undefined}
                                            data-deal-chip={p.slug}
                                        >
                                            {dealConsoleLinkLabel(chip)}
                                        </Anchor>
                                    </span>
                                );
                            })}
                        </Text>
                    )}
                    <Text fz="sm" c="dimmed" mt="xs" mb={0}>
                        {DEALS_SCOPE_NOTE}
                    </Text>
                </InfoHeading>
                <Text fz="sm" c="dimmed" mb="sm">
                    {DEALS_TYPICAL_NOTE}
                </Text>
                <Text component="p" fz="sm" c="dimmed" maw={760} mb="lg">
                    {DEALS_METHOD_LINE}
                </Text>

                {deals.length > 0 ? (
                    <GameExplorer
                        key={`${slug ?? 'all'}:${page}`}
                        lockedDeals
                        dealsIsToday={isToday}
                        lockedPlatform={
                            platform
                                ? { id: platform.id, slug: platform.slug, display_name: platformLongName(platform) }
                                : undefined
                        }
                        initialGames={games}
                        initialTotal={total}
                        page={page}
                        pageSize={DEALS_PAGE_SIZE}
                        defaultOrdering={DEALS_ORDERING}
                        showHeader={false}
                        withContainer={false}
                        staticFallback={
                            <>
                            <Text size="sm" c="dimmed" mb="md" data-deals-range>
                                {dealsRangeLabel(page, total)}
                            </Text>
                            <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', sm: 'lg' }} verticalSpacing="xl">
                                {deals.map((deal, i) => (
                                    <DealCard
                                        key={`${deal.game.id}-${deal.platform}`}
                                        deal={deal}
                                        previewFilters={platform ? { platform: platform.slug } : undefined}
                                        priority={i < 4}
                                        isToday={isToday}
                                    />
                                ))}
                            </SimpleGrid>
                            <CrawlablePagination current={page} total={totalPages} hrefFor={(n) => dealsPath(platform, n)} />
                            </>
                        }
                    />
                ) : (
                    // El «Hoy no hay juegos…» (o, si la API falló, el texto
                    // neutro) ya lo dice el resumen de arriba, que es la misma
                    // frase de la meta description: aquí solo la salida hacia
                    // el catálogo.
                    <Text c="dimmed">
                        Mientras tanto,{' '}
                        <Anchor component={Link} href="/search" c="primaryRed">
                            explora el catálogo completo
                        </Anchor>
                        .
                    </Text>
                )}
            </Container>
        </>
    );
}
