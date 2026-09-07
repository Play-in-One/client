import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import {
    buildMetadata, gameJsonLd, gamePath, breadcrumbJsonLd, faqJsonLd, bestPriceSentence,
} from '@/lib/seo';
import { buildGameFaq } from '@/lib/gameFaq';
import { formatCLP, sampleBy, POPULAR_SAMPLE_SIZE } from '@/lib/utils';
import { getPopularGames } from '@/lib/api';
import { AD_SLOT_GAME_FOOTER, adsAllowedForCountry } from '@/lib/ads';
import AdSlot from '@/components/AdSlot';
import FaqSection from '@/components/FaqSection';
import PopularGamesSection from '@/components/PopularGamesSection';
import { PREFS_COOKIE, parsePrefs } from '@/lib/prefs';
import GameDetailClient from './GameDetailClient';
import { fetchGame, parseGameSegment } from './resolve';

/* Pool del que sale la muestra de "Otros juegos populares". Se pide SIN filtros
   y sin el id a excluir, para que la URL sea idéntica en todas las fichas y su
   respuesta se comparta en el Data Cache de Next.

   El TTL es largo a propósito: `traffic_score` solo se reescribe una vez al día
   (el cron de `rollup_analytics`), así que revalidar cada 5 min estaría pagando
   ~72 veces más misses de los que el dato justifica. */
const POPULAR_POOL_SIZE = 40;
const POPULAR_POOL_REVALIDATE = 60 * 60 * 6;

/** Los 4 de la muestra, o `[]` si el API falla: la ficha no se cae por una
 *  sección de descubrimiento. */
async function fetchPopularSample(excludeId: number) {
    try {
        const res = await getPopularGames({
            limit: POPULAR_POOL_SIZE,
            revalidate: POPULAR_POOL_REVALIDATE,
        });
        // El barajado corre en el SERVIDOR: el HTML ya lleva los 4 elegidos y
        // el cliente hidrata sobre ellos, sin mismatch.
        return sampleBy(res.results, POPULAR_SAMPLE_SIZE, excludeId);
    } catch (err) {
        console.error('Failed to fetch popular games:', err);
        return [];
    }
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

    const platforms = game.platforms.map((p) => p.display_name).join(', ');
    // La frase del precio va PRIMERO y la descripción editorial después: es el
    // dato que resuelve la búsqueda ("¿cuánto cuesta X?") y el que un motor
    // generativo cita. Sin oferta se cae a la descripción de siempre.
    const description =
        bestPriceSentence(game) ||
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

    /* Los filtros globales se leen de la cookie y viajan como props: así el
       HTML sale ya filtrado y no hay nada que corregir tras hidratar, que es lo
       que hacía parpadear las ofertas de tiendas internacionales.
       `cookies()` deja esta ruta fuera del prerender estático — aquí no cuesta
       nada porque `getGame` ya se resuelve en cada petición, pero conviene
       saberlo antes de intentar cachearla. */
    const prefs = parsePrefs((await cookies()).get(PREFS_COOKIE)?.value);
    const popular = await fetchPopularSample(game.id);

    /* El geo-bloqueo de la publicidad se resuelve AQUÍ y no en el layout raíz:
       `headers()` allí sacaría del render estático a toda la app y se llevaría
       por delante el ISR de la home, las landings y la paginación. Esta ruta ya
       es dinámica por el `cookies()` de arriba, así que leer la cabecera no
       cuesta nada. */
    const adsAllowed = adsAllowedForCountry((await headers()).get('cf-ipcountry'));

    // La miga estructurada dice lo mismo que la visible (`GameDetailClient`):
    // la consola de `?platform=` si el juego la tiene, si no la primera. Pasa
    // por la landing, que reparte autoridad hacia el camino que descubre las
    // fichas; `/search` solo si el juego no tiene ninguna consola.
    const crumbPlatform =
        (platform ? game.platforms.find((p) => p.slug === platform) : undefined) ?? game.platforms[0];
    const faq = buildGameFaq(game);
    const jsonLd = [
        gameJsonLd(game),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            crumbPlatform
                ? { name: crumbPlatform.display_name, path: `/juegos/${crumbPlatform.slug}` }
                : { name: 'Juegos', path: '/search' },
            { name: game.name, path: gamePath(game) },
        ]),
        ...(faq.length ? [faqJsonLd(faq, gamePath(game))] : []),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <Suspense fallback={null}>
                <GameDetailClient initialGame={game} initialPrefs={prefs} />
            </Suspense>
            <FaqSection
                entries={faq}
                title={`Preguntas frecuentes sobre ${game.name}`}
                collapsible
                /* 'lg' como el Container de GameDetailClient: con el 'xl' por
                   defecto la sección se salía por la izquierda del resto. */
                size="lg"
            />
            {/* Al fondo del todo. Sin JSON-LD: son enlaces internos hacia otras
                fichas, no una lista que ESTA página sea — un `ItemList` aquí
                declararía un catálogo que la ficha no es. */}
            <PopularGamesSection initialGames={popular} excludeId={game.id} />
            {/* Debajo de todo el contenido, nunca junto a la tabla de precios:
                un anuncio que compita con las ofertas convierte el producto en
                el señuelo. Sin configurar o fuera de zona no renderiza nada,
                ni siquiera el contenedor. */}
            <AdSlot slot={AD_SLOT_GAME_FOOTER} allowed={adsAllowed} />
        </>
    );
}
