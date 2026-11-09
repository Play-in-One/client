import { platformLongName } from '@/lib/types';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import {
    buildMetadata, gameJsonLd, gamePath, breadcrumbJsonLd, faqJsonLd,
} from '@/lib/seo';
import { buildGameFaq } from '@/lib/gameFaq';
import { priceSummarySentences, monthlyMinimums } from '@/lib/priceSummary';
import { genreHref } from '@/lib/routes';
import { formatCLP } from '@/lib/utils';
import { getGames, getPopularGames, getRelatedGames } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import { AD_SLOT_GAME_FOOTER, adsAllowedForCountry } from '@/lib/ads';
import AdSlot from '@/components/AdSlot';
import FaqSection from '@/components/FaqSection';
import type { Prefs } from '@/lib/prefs';
import { packGame } from '@/lib/gamePayload';
import GameDetailClient from './GameDetailClient';
import { GamePlatformProvider } from './GamePlatformContext';
import PriceSummarySection from './PriceSummarySection';
import RelatedGamesSection, { RelatedGamesSkeleton } from './RelatedGamesSection';
import type { RelatedQuery } from './RelatedGamesGrid';
import GamePreviewShell from './GamePreviewShell';
import { fetchGame, parseGameSegment, readGamePreview, startGameFetch } from './resolve';

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
    query: RelatedQuery;
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
    if (process.env.CATALOG_RELATED_ENABLED === '1') {
        try {
            const result = await getRelatedGames(game.id, platform?.slug);
            if (!result.results.length) return null;
            const saga = game.sagas?.[0];
            const genre = game.genres?.[0];
            const platformName = platform ? platformLongName(platform) : null;
            if (result.kind === 'saga' && saga) return {
                games: result.results, query: { kind: 'saga', saga: saga.slug },
                title: `Más juegos de la saga ${saga.name}`, moreHref: `/saga/${saga.slug}`,
                moreLabel: 'Ver toda la saga',
            };
            if (result.kind === 'genre' && genre) return {
                games: result.results, query: { kind: 'genre', genre: genre.id, platform: platform?.id },
                title: `Más juegos de ${genre.name}${platformName ? ` para ${platformName}` : ''}`,
                moreHref: genreHref(genre, platform?.slug), moreLabel: 'Ver más de este género',
            };
            return {
                games: result.results, query: { kind: 'popular', limit: RELATED_LIMIT + 1, platform: platform?.slug },
                title: platformName ? `Otros juegos populares de ${platformName}` : 'Otros juegos populares',
                moreHref: platform ? `/juegos/${platform.slug}` : '/search', moreLabel: 'Ver todos',
            };
        } catch (error) {
            console.error('Failed to fetch related games:', error);
            return null;
        }
    }
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
                query: { kind: 'saga', saga: saga.slug },
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
                query: { kind: 'genre', genre: genre.id, platform: platform?.id },
                title: `Más juegos de ${genre.name}${platformName ? ` para ${platformName}` : ''}`,
                moreHref: genreHref(genre, platform?.slug),
                moreLabel: `Ver más de ${genre.name}`,
            };
        }
    }

    // Uno de más: el propio juego puede estar en la lista y se descarta.
    const popular = { limit: RELATED_LIMIT + 1, platform: platform?.slug };
    const games = await pick(() => getPopularGames({ ...popular, revalidate: RELATED_REVALIDATE }));
    if (games.length === 0) return null;
    return {
        games,
        query: { kind: 'popular', ...popular },
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
 * En un documento, el 404 y ese 308 los decide `layout.tsx` (ver ahí por qué)
 * y lo de aquí cuesta cero porque `getGame` está memoizado dentro de la
 * petición. En una petición RSC (navegación del cliente) el layout no consulta,
 * así que las comprobaciones de este archivo son las que actúan: el router
 * resuelve el `notFound()` y el `permanentRedirect()` dentro del stream.
 */

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ platform?: string | string[] }>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
    const game = (await readGamePreview((await params).slug, searchParams))?.preview;
    if (!game) notFound();

    const platforms = game.platforms.map(platformLongName).join(', ');
    // Metadata uses the same fast read as the first frame. Historical data
    // remains in the streamed summary and JSON-LD, outside the critical path.
    const description =
        (game.canonical_min_price ? `${game.name} desde ${formatCLP(game.canonical_min_price)}. Compara precios en Play in One.` : '') ||
        game.description?.trim() ||
        `Compara precios de ${game.name}${platforms ? ` para ${platforms}` : ''} entre tiendas chilenas en Play in One.`;

    // El título lleva la intención de búsqueda que PIO puede ganar ("X precio",
    // "X chile"), no solo el nombre: con el nombre a secas se compite contra
    // la wiki y la tienda oficial por una consulta que no es la nuestra. El
    // precio es el efectivo (con envío), la misma cifra que ve la persona.
    const title = game.canonical_min_price
        ? `${game.name}: precio en Chile desde ${formatCLP(game.canonical_min_price)}`
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
    const segment = (await params).slug;
    const id = parseGameSegment(segment)?.id;
    if (!id) notFound();
    startGameFetch(id);
    const request = await readGamePreview(segment, searchParams);
    if (!request?.preview) notFound();
    const { parsed, platform, prefs, preview } = request;
    if (parsed.slug !== preview.slug) permanentRedirect(gamePath(preview, platform));

    return <Suspense fallback={<GamePreviewShell game={preview} />}>
        <CompleteGame id={parsed.id} platform={platform} prefs={prefs} preview={preview} />
    </Suspense>;
}

async function CompleteGame({ id, platform, prefs, preview }: {
    id: string; platform?: string; prefs: Prefs;
    preview: import('@/lib/api').GamePreview;
}) {
    let game: Game | null;
    try {
        game = await fetchGame(id);
    } catch (error) {
        console.error('Failed to load the complete game:', error);
        game = null;
    }
    /* Aquí ya no hay `notFound()`: este componente corre DENTRO del boundary
       de streaming, cuando el 200 y la metadata indexable ya salieron. Un
       `notFound()` tardío era un soft 404. Si el detalle falta (el juego
       desapareció entre el preview y el detalle, o el backend falló) se queda
       el shell con su "Reintentar" y la página se marca `noindex`: React 19
       sube el `<meta>` al <head>. */
    if (!game) return <>
        <meta name="robots" content="noindex" />
        <GamePreviewShell game={preview} failed />
    </>;
    const crumbPlatform = game.platforms.find(p => p.slug === platform) ?? game.platforms[0];

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
                <Suspense fallback={<GamePreviewShell game={preview} />}>
                    <GameDetailClient
                        initialGame={packGame(game)}
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
                <Suspense fallback={<RelatedGamesSkeleton count={RELATED_LIMIT} />}>
                    <RelatedContent game={game} platform={crumbPlatform} />
                </Suspense>
            </GamePlatformProvider>
            {/* Debajo de todo el contenido, nunca junto a la tabla de precios:
                un anuncio que compita con las ofertas convierte el producto en
                el señuelo. Sin configurar o fuera de zona no renderiza nada,
                ni siquiera el contenedor. */}
            <AdSlot slot={AD_SLOT_GAME_FOOTER} allowed={adsAllowed} />
        </>
    );
}

async function RelatedContent({ game, platform }: { game: Game; platform?: Platform }) {
    const related = await fetchRelated(game, platform);
    return related ? <RelatedGamesSection
        games={related.games} query={related.query} excludeId={game.id} limit={RELATED_LIMIT}
        title={related.title} moreHref={related.moreHref} moreLabel={related.moreLabel}
        platformSlug={platform?.slug}
    /> : null;
}
