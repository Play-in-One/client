import { platformLongName } from '@/lib/types';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import {
    buildMetadata, gameJsonLd, gamePath, breadcrumbJsonLd, faqJsonLd,
} from '@/lib/seo';
import { buildGameFaq } from '@/lib/gameFaq';
import { priceSummarySentences, monthlyMinimums } from '@/lib/priceSummary';
import { genreHref } from '@/lib/routes';
import { formatCLP } from '@/lib/utils';
import { getGames, getPopularGames } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import { AD_SLOT_GAME_FOOTER, adsAllowedForCountry } from '@/lib/ads';
import AdSlot from '@/components/AdSlot';
import FaqSection from '@/components/FaqSection';
import { PREFS_COOKIE, parsePrefs } from '@/lib/prefs';
import GameDetailClient from './GameDetailClient';
import { GamePlatformProvider } from './GamePlatformContext';
import PriceSummarySection from './PriceSummarySection';
import RelatedGamesSection from './RelatedGamesSection';
import { fetchGame, parseGameSegment } from './resolve';

const RELATED_LIMIT = 8;
/* Por debajo de esto un criterio no merece sección propia: se prueba el
   siguiente. Con un solo juego "Más juegos de la saga" se lee como un error. */
const RELATED_MIN = 2;
/* Las tres listas se piden con la misma URL para todas las fichas de esa saga,
   género+consola o consola (el id propio se descarta aquí, no en la query), así
   que se comparten en el Data Cache de Next. Una hora sobra: es una sección de
   descubrimiento, no un precio. */
const RELATED_REVALIDATE = 60 * 60;

interface Related {
    games: Game[];
    title: string;
    moreHref: string;
    moreLabel: string;
}

/**
 * Juegos relacionados, del criterio más cercano al más amplio: misma saga,
 * mismo género en la consola vista, o los populares de esa consola. Un criterio
 * con menos de `RELATED_MIN` juegos cae al siguiente.
 *
 * Determinista a propósito (orden del backend, sin sorteo): un crawler tiene
 * que ver los mismos enlaces en cada visita, y el HTML no puede discrepar del
 * que hidrata el cliente. Cada petición falla a `[]`: la ficha no se cae por
 * una sección de descubrimiento.
 */
async function fetchRelated(game: Game, platform: Platform | undefined): Promise<Related | null> {
    const pick = async (load: () => Promise<{ results: Game[] }>) => {
        try {
            const { results } = await load();
            return results.filter((g) => g.id !== game.id).slice(0, RELATED_LIMIT);
        } catch (err) {
            console.error('Failed to fetch related games:', err);
            return [];
        }
    };
    const platformName = platform ? platformLongName(platform) : null;

    const saga = game.sagas?.[0];
    if (saga) {
        const games = await pick(() => getGames({
            saga: saga.slug, ordering: '-traffic_score,name', revalidate: RELATED_REVALIDATE,
        }));
        if (games.length >= RELATED_MIN) {
            return {
                games,
                title: `Más juegos de la saga ${saga.name}`,
                moreHref: `/saga/${saga.slug}`,
                moreLabel: 'Ver toda la saga',
            };
        }
    }

    const genre = game.genres?.[0];
    if (genre) {
        const games = await pick(() => getGames({
            genres: genre.id,
            ...(platform ? { platforms: [platform.id] } : {}),
            ordering: '-traffic_score,name',
            revalidate: RELATED_REVALIDATE,
        }));
        if (games.length >= RELATED_MIN) {
            return {
                games,
                title: `Más juegos de ${genre.name}${platformName ? ` para ${platformName}` : ''}`,
                moreHref: genreHref(genre, platform?.slug),
                moreLabel: `Ver más de ${genre.name}`,
            };
        }
    }

    const games = await pick(() => getPopularGames({
        // Uno de más: el propio juego puede estar en la lista y se descarta.
        limit: RELATED_LIMIT + 1, platform: platform?.slug, revalidate: RELATED_REVALIDATE,
    }));
    if (games.length === 0) return null;
    return {
        games,
        title: platformName ? `Otros juegos populares de ${platformName}` : 'Otros juegos populares',
        moreHref: platform ? `/juegos/${platform.slug}` : '/search',
        moreLabel: 'Ver todos',
    };
}

/**
 * Ficha de un juego: `/juego/<slug>-<id>`.
 *
 * El id es lo único que resuelve. El slug lo deriva el backend del nombre y es
 * cosmético: si no cuadra (nombre corregido, enlace viejo, `/juego/<id>` a
 * secas) se responde 308 a la canónica en vez de servir dos URLs con la misma
 * ficha. `/game/<id>`, la ruta anterior, vive solo como redirección.
 *
 * El 404 y ese 308 los decide `layout.tsx` (ver ahí por qué); las
 * comprobaciones de este archivo son la red de seguridad y cuestan cero
 * porque el `getGame` está memoizado dentro de la petición.
 */

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ platform?: string | string[] }>;

function firstParam(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const parsed = parseGameSegment((await params).slug);
    const game = parsed && (await fetchGame(parsed.id));
    if (!game) notFound();

    const platforms = game.platforms.map(platformLongName).join(', ');
    // Las dos primeras frases del resumen visible (la del precio más barato,
    // que siempre abre, y la del mínimo histórico): la meta description dice
    // lo mismo que la página, que es lo que un buscador cita. Sin oferta el
    // resumen sale vacío y se cae a la descripción de siempre.
    const description =
        priceSummarySentences(game).slice(0, 2).join(' ') ||
        game.description?.trim() ||
        `Compara precios de ${game.name}${platforms ? ` para ${platforms}` : ''} entre tiendas chilenas en Play in One.`;

    // El título lleva la intención de búsqueda que PIO puede ganar ("X precio",
    // "X chile"), no solo el nombre: con el nombre a secas se compite contra
    // la wiki y la tienda oficial por una consulta que no es la nuestra. El
    // precio es el efectivo (con envío), la misma cifra que ve la persona.
    const title = game.min_price
        ? `${game.name}: precio en Chile desde ${formatCLP(game.min_price)}`
        : `${game.name}: precios en Chile`;

    return buildMetadata({
        title,
        description,
        path: gamePath(game),
        image: game.image,
        // Lo decide el backend (`seo_index`): una ficha delgada responde 200 —es
        // válida y se enlaza— pero no merece índice. `undefined` (backend
        // anterior al campo) se indexa como siempre.
        noIndex: game.seo_index === false,
    });
}

export default async function GameDetailPage({
    params,
    searchParams,
}: {
    params: Params;
    searchParams: SearchParams;
}) {
    const parsed = parseGameSegment((await params).slug);
    if (!parsed) notFound();
    const game = await fetchGame(parsed.id);
    if (!game) notFound();

    const platform = firstParam((await searchParams).platform);
    // Dos URLs con la misma ficha se resuelven con una sola, no con un canonical.
    if (parsed.slug !== game.slug) permanentRedirect(gamePath(game, platform));

    // La consola de `?platform=` si el juego la tiene, si no la primera. La
    // usan la miga estructurada, `GameDetailClient` (vía GamePlatformProvider,
    // más abajo) Y los juegos relacionados: es exactamente "la consola que se
    // está viendo" en la ficha.
    const crumbPlatform =
        (platform ? game.platforms.find((p) => p.slug === platform) : undefined) ?? game.platforms[0];

    /* Los filtros globales se leen de la cookie y viajan como props: así el
       HTML sale ya filtrado y no hay nada que corregir tras hidratar, que es lo
       que hacía parpadear las ofertas de tiendas internacionales.
       `cookies()` deja esta ruta fuera del prerender estático — aquí no cuesta
       nada porque `getGame` ya se resuelve en cada petición, pero conviene
       saberlo antes de intentar cachearla. */
    const prefs = parsePrefs((await cookies()).get(PREFS_COOKIE)?.value);
    const related = await fetchRelated(game, crumbPlatform);

    /* El geo-bloqueo de la publicidad se resuelve AQUÍ y no en el layout raíz:
       `headers()` allí sacaría del render estático a toda la app y se llevaría
       por delante el ISR de la home, las landings y la paginación. Esta ruta ya
       es dinámica por el `cookies()` de arriba, así que leer la cabecera no
       cuesta nada. */
    const adsAllowed = adsAllowedForCountry((await headers()).get('cf-ipcountry'));

    const faq = buildGameFaq(game);
    const summary = priceSummarySentences(game);
    const monthly = monthlyMinimums(game.min_price_history ?? {});
    const jsonLd = [
        gameJsonLd(game),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            crumbPlatform
                ? { name: platformLongName(crumbPlatform), path: `/juegos/${crumbPlatform.slug}` }
                : { name: 'Juegos', path: '/search' },
            { name: game.name, path: gamePath(game) },
        ]),
        ...(faq.length ? [faqJsonLd(faq, gamePath(game))] : []),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <GamePlatformProvider initialPlatform={crumbPlatform?.slug ?? null}>
                <Suspense fallback={null}>
                    <GameDetailClient
                        initialGame={game}
                        initialPrefs={prefs}
                        /* Server Components como slots: su texto sale en el HTML
                           del servidor y no viaja en el bundle de la ficha. */
                        summarySlot={
                            summary.length || monthly.length
                                ? <PriceSummarySection sentences={summary} monthly={monthly} platforms={game.platforms} />
                                : undefined
                        }
                    />
                </Suspense>
                <FaqSection
                    entries={faq}
                    title={`Preguntas frecuentes sobre ${game.name}`}
                    collapsible
                    /* 'lg' como el Container de GameDetailClient: con el 'xl' por
                       defecto la sección se salía por la izquierda del resto. */
                    size="lg"
                />
                {/* Al fondo del todo, en el servidor (ver RelatedGamesSection). */}
                {related && (
                    <RelatedGamesSection
                        games={related.games}
                        title={related.title}
                        moreHref={related.moreHref}
                        moreLabel={related.moreLabel}
                        platformSlug={crumbPlatform?.slug}
                    />
                )}
            </GamePlatformProvider>
            {/* Debajo de todo el contenido, nunca junto a la tabla de precios:
                un anuncio que compita con las ofertas convierte el producto en
                el señuelo. Sin configurar o fuera de zona no renderiza nada,
                ni siquiera el contenedor. */}
            <AdSlot slot={AD_SLOT_GAME_FOOTER} allowed={adsAllowed} />
        </>
    );
}
