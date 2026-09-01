import type { MetadataRoute } from 'next';
import { getGameFacets, getGamesForSitemap, getPlatforms, getPosts, getSellers } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';
import { PAGE_SIZE as GAMES_PER_PAGE } from './juegos/[slug]/landing';

/**
 * Se genera POR PETICIÓN, nunca en el build.
 *
 * `API_URL` (el backend interno) solo existe en runtime: durante `docker build`
 * las llamadas caen a `NEXT_PUBLIC_API_URL`, o sea a la API **pública**, que en
 * ese momento sigue sirviendo el backend ANTERIOR. Prerenderizado, el sitemap se
 * horneaba contra la versión vieja y el `try/catch` de cada bloque convertía un
 * endpoint que todavía no existía en un bloque vacío — y ese XML incompleto
 * quedaba servido hasta la siguiente revalidación.
 *
 * El coste de no cachear aquí es bajo: quien pide esto son crawlers, y cada
 * fuente ya viene cacheada del backend (el catálogo 10 min, las facets 90 s,
 * plataformas y tiendas por `CachedListMixin`).
 */
export const dynamic = 'force-dynamic';

// Tope de seguridad para los bloques que SÍ se recorren paginados (posts y
// tiendas, decenas de filas). La API pagina de a 24, no de a 50 como decía este
// comentario, y el catálogo de juegos —que son miles— ya no pasa por aquí: lo
// resuelve `/api/games/sitemap/` de una sola vez.
const MAX_PAGES = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
        { url: absoluteUrl('/search'), changeFrequency: 'daily', priority: 0.9 },
        { url: absoluteUrl('/faq'), changeFrequency: 'monthly', priority: 0.6 },
        { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.6 },
        { url: absoluteUrl('/about'), changeFrequency: 'yearly', priority: 0.3 },
        { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.3 },
        { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.2 },
        { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
        { url: absoluteUrl('/cookies'), changeFrequency: 'yearly', priority: 0.2 },
    ];

    // Landings por consola. Van con prioridad alta: son las páginas que
    // responden "juegos de PS5 baratos", la búsqueda con más volumen del
    // sitio, y son pocas y estables.
    //
    // Detrás van sus páginas interiores (`/juegos/ps5/pagina/2`…), con
    // prioridad baja: no valen por sí mismas, valen porque son el camino por el
    // que un crawler llega a las fichas. Cuántas hay sale de `facets`, que ya
    // publica cuántos juegos tiene cada consola y está cacheado en el backend.
    const platforms: MetadataRoute.Sitemap = [];
    try {
        const res = await getPlatforms();
        const counts = await getGameFacets()
            .then((f) => f.platforms)
            .catch(() => ({} as Record<number, number>));
        for (const p of res.results) {
            platforms.push({
                url: absoluteUrl(`/juegos/${p.slug}`),
                changeFrequency: 'daily',
                priority: 0.9,
            });
            const pages = Math.ceil((counts[p.id] ?? 0) / GAMES_PER_PAGE);
            for (let page = 2; page <= pages; page++) {
                platforms.push({
                    url: absoluteUrl(`/juegos/${p.slug}/pagina/${page}`),
                    changeFrequency: 'daily',
                    priority: 0.3,
                });
            }
        }
    } catch {
        /* ignore */
    }

    const games: MetadataRoute.Sitemap = [];
    try {
        // Una sola petición para las ~10.000 fichas. Recorrer el listado
        // paginado era lo que truncaba el sitemap al 15% del catálogo.
        const res = await getGamesForSitemap();
        for (const g of res.results) {
            games.push({
                url: absoluteUrl(`/game/${g.id}`),
                // Cuándo cambió por última vez el precio del juego. El juego en
                // sí no tiene timestamp, y lo que se actualiza de él es esto.
                ...(g.lastmod ? { lastModified: g.lastmod } : {}),
                changeFrequency: 'daily',
                priority: 0.8,
            });
        }
    } catch {
        /* API unavailable — ship the static routes we have */
    }

    const posts: MetadataRoute.Sitemap = [];
    try {
        for (let page = 1; page <= MAX_PAGES; page++) {
            const res = await getPosts({ page, ordering: '-published_date' });
            for (const p of res.results) {
                posts.push({
                    url: absoluteUrl(`/blog/${p.id}`),
                    lastModified: p.published_date,
                    changeFrequency: 'monthly',
                    priority: 0.5,
                });
            }
            if (!res.next) break;
        }
    } catch {
        /* ignore */
    }

    const stores: MetadataRoute.Sitemap = [];
    try {
        for (let page = 1; page <= MAX_PAGES; page++) {
            const res = await getSellers({ page });
            for (const s of res.results) {
                stores.push({
                    url: absoluteUrl(`/store/${s.id}`),
                    changeFrequency: 'weekly',
                    priority: 0.4,
                });
            }
            if (!res.next) break;
        }
    } catch {
        /* ignore */
    }

    return [...staticRoutes, ...platforms, ...games, ...posts, ...stores];
}
