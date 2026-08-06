import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { getGames, getPlatforms, getGenres, getSellers } from '@/lib/api';
import SearchClient from './SearchClient';

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
    const noIndex = Object.keys(sp).length > 0;

    return buildMetadata({ title, description, path: '/search', noIndex });
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const hasParams = Object.keys(sp).length > 0;

    // Opciones de filtro (independientes de los filtros) siempre desde el
    // servidor; la primera página de juegos solo para la entrada limpia /search
    // (las permutaciones con filtros conservan el fetch en el cliente).
    const [platforms, genres, sellers, games] = await Promise.all([
        getPlatforms().then((r) => r.results).catch(() => undefined),
        getGenres().then((r) => r.results).catch(() => undefined),
        getSellers().then((r) => r.results).catch(() => undefined),
        hasParams
            ? Promise.resolve(undefined)
            : getGames({ ordering: 'name', page: 1 }).catch(() => undefined),
    ]);

    return (
        <SearchClient
            initialPlatforms={platforms}
            initialGenres={genres}
            initialSellers={sellers}
            initialGames={games?.results}
            initialTotal={games?.count}
        />
    );
}
