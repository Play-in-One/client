import type { Metadata } from 'next';
import { getGames } from '@/lib/api';
import type { Game } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, collectionPageJsonLd, itemListJsonLd } from '@/lib/seo';
import { formatCLP } from '@/lib/utils';
import SearchClient from './SearchClient';

// Debe coincidir con el DEFAULT_ORDERING de SearchClient: si el servidor
// sirviera un orden distinto del que pide el cliente al hidratar, la galería
// se reordenaría sola delante de quien la está mirando.
const DEFAULT_ORDERING = '-traffic_score,name';

// El catálogo se mueve con cada scrapeo. 5 minutos mantiene fresca la entrada
// indexable sin pagar el fetch en cada visita — que es lo que motivó que esta
// página fuera un shell 100% cliente.
export const revalidate = 300;

/** Solo la entrada limpia a /search se resuelve en el servidor: es la única
 *  que se indexa. Con filtros la página sigue siendo cliente y `noindex`, así
 *  que renderizarla en el servidor sería pagar un fetch por nada. */
async function fetchFirstPage(): Promise<{ games: Game[]; total: number }> {
    try {
        const res = await getGames({ page: 1, ordering: DEFAULT_ORDERING });
        return { games: res.results, total: res.count };
    } catch {
        // La galería se llena igual en el cliente: un backend caído no debe
        // tumbar la página, solo dejarla sin su versión indexable.
        return { games: [], total: 0 };
    }
}

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
    const sp = await searchParams;
    const q = typeof sp.q === 'string' ? sp.q.trim() : '';

    const title = q ? `Resultados para "${q}"` : 'Buscar videojuegos';
    const description = q
        ? `Precios y ofertas de "${q}" en tiendas chilenas, comparados en Play in One.`
        : 'Busca y compara precios de videojuegos entre tiendas chilenas. Filtra por plataforma, género, tienda y condición.';

    // Index only the clean /search entry; noindex any query/filter permutation
    // (thin/duplicate content) while still letting crawlers follow the links.
    const keys = Object.keys(sp);
    const noIndex = keys.length > 0;

    // `?platform=ps5` es la ÚNICA permutación que tiene equivalente indexable:
    // /juegos/ps5. Apuntar ahí el canonical recupera los enlaces del Navbar y
    // el Footer, que hasta ahora se perdían contra una página noindex. Solo
    // aplica a una consola suelta: los grupos del menú mandan varios slugs
    // separados por coma y no tienen landing propia.
    const platform = typeof sp.platform === 'string' ? sp.platform : '';
    const canonicalPath =
        keys.length === 1 && platform && !platform.includes(',')
            ? `/juegos/${platform}`
            : '/search';

    return buildMetadata({ title, description, path: canonicalPath, noIndex });
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const isCleanEntry = Object.keys(sp).length === 0;
    const { games, total } = isCleanEntry
        ? await fetchFirstPage()
        : { games: [] as Game[], total: 0 };

    const cheapest = games.find((g) => g.min_price != null);
    const description = cheapest
        ? `Comparamos ${total.toLocaleString('es-CL')} videojuegos entre tiendas chilenas. ` +
          `El más barato del catálogo ` +
          `ahora es ${cheapest.name} a ${formatCLP(cheapest.min_price!)}` +
          `${cheapest.min_price_seller ? ` en ${cheapest.min_price_seller.name}` : ''}.`
        : 'Busca y compara precios de videojuegos entre tiendas chilenas.';

    const jsonLd = games.length
        ? [
            collectionPageJsonLd({
                name: 'Catálogo de videojuegos',
                description,
                path: '/search',
            }),
            itemListJsonLd(games, { path: '/search', name: 'Videojuegos comparados en Play in One' }),
        ]
        : [];

    return (
        <>
            {jsonLd.length > 0 && <JsonLd data={jsonLd} />}
            <SearchClient initialGames={games} initialTotal={total} />
        </>
    );
}
