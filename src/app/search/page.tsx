import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
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

export default function SearchPage() {
    // Shell 100% cliente: pinta al instante (con el skeleton de loading.tsx en la
    // navegación) y la grilla se llena tras el fetch en el cliente. Evita bloquear
    // el TTFB en las llamadas al backend (que pueden tardar 1-2s).
    return <SearchClient />;
}
