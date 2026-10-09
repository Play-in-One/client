import type { Metadata } from 'next';
import Link from 'next/link';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { notFound } from 'next/navigation';
import { Anchor, Badge, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { getDeals, getPlatforms } from '@/lib/api';
import type { DealsResponse, Platform } from '@/lib/types';
import { platformLongName } from '@/lib/types';
import DealCard from '@/components/DealCard';
import InfoHeading from '@/components/InfoHeading';
import { JsonLd } from '@/components/JsonLd';
import {
    DEALS_METHOD_LINE,
    DEALS_SCOPE_NOTE,
    dealCardGame,
    dealConsoleChipLabel,
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
 * páginas es solo la red de seguridad. No se vuelven a pedir con los filtros
 * del visitante: una oferta es un hecho del catálogo, y filtrarla en el cliente
 * necesitaría otra API. La página lo dice (`DEALS_SCOPE_NOTE`).
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
        return { res: await getDeals(platform ? { platform: platform.slug } : undefined), failed: false };
    } catch (error) {
        rethrowOutsideBuild(error);
        return { res: EMPTY, failed: true };
    }
}

export function dealsPath(platform?: Platform | null): string {
    return platform ? `/ofertas/${platform.slug}` : '/ofertas';
}

export async function buildDealsMetadata(slug?: string): Promise<Metadata> {
    const platform = await fetchPlatform(slug);
    if (platform === null) return buildMetadata({ title: 'Consola no encontrada', noIndex: true });

    const { res, failed } = await fetchDeals(platform);
    // Las reglas de «hoy», el texto y el `noindex` viven en `dealsPageView`:
    // la página y su metadata tienen que decir lo mismo.
    const view = dealsPageView(res, { platform, failed });
    return buildMetadata({
        title: view.heading,
        // La misma frase que se lee bajo el H1: lo que cita un buscador tiene
        // que estar en la página.
        description: view.summary,
        path: dealsPath(platform),
        noIndex: view.noIndex,
    });
}

export default async function DealsLanding({ slug }: { slug?: string }) {
    const { platform, catalog } = await fetchPlatforms(slug);
    // Página propia (sin `loading.tsx`): el 404 es un status real.
    if (platform === null) notFound();

    const { res, failed } = await fetchDeals(platform);
    const deals = res.results;
    const path = dealsPath(platform);
    // En el servidor, con el reloj de esta regeneración: «hoy» o «del <fecha>»
    // llega ya resuelto al HTML y a las tarjetas (`isToday`).
    const { heading, summary, isToday } = dealsPageView(res, { platform, failed });
    // Todas las consolas con ofertas hoy y cuántos juegos tiene cada una
    // (`res.platforms`, la misma lista con o sin filtro), con la actual marcada.
    const consoles = dealConsoleChips(res, catalog);

    const jsonLd = [
        collectionPageJsonLd({ name: heading, description: summary, path }),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Ofertas', path: '/ofertas' },
            ...(platform ? [{ name: platformLongName(platform), path }] : []),
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
                </InfoHeading>
                <Text fz="sm" c="dimmed" mb="sm">
                    {DEALS_SCOPE_NOTE}
                </Text>
                <Text component="p" fz="sm" c="dimmed" maw={760} mb="lg">
                    {DEALS_METHOD_LINE}
                </Text>

                {consoles.length > 0 && (
                    <Group component="nav" aria-label="Ofertas por consola" gap="xs" mb="xl">
                        {platform && (
                            <Badge component={Link} href="/ofertas" size="lg" variant="light" color="gray" style={{ cursor: 'pointer' }}>
                                Todas
                            </Badge>
                        )}
                        {consoles.map((chip) => {
                            const p = chip.platform;
                            const active = p.slug === platform?.slug;
                            return (
                                <Badge
                                    key={p.slug}
                                    component={Link}
                                    href={`/ofertas/${p.slug}`}
                                    size="lg"
                                    variant={active ? 'filled' : 'light'}
                                    color="primaryRed"
                                    aria-current={active ? 'page' : undefined}
                                    data-deal-chip={p.slug}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {dealConsoleChipLabel(chip)}
                                </Badge>
                            );
                        })}
                    </Group>
                )}

                {deals.length > 0 ? (
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing={{ base: 'xs', sm: 'lg' }} verticalSpacing="xl">
                        {deals.map((deal, i) => (
                            <DealCard
                                key={`${deal.game.id}-${deal.platform}`}
                                deal={deal}
                                priority={i < 4}
                                isToday={isToday}
                            />
                        ))}
                    </SimpleGrid>
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
