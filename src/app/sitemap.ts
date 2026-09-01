import type { MetadataRoute } from 'next';
import { getGames, getPlatforms, getPosts, getSellers } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';

// Regenerate at most hourly so new games/posts appear without a redeploy.
export const revalidate = 3600;

const MAX_PAGES = 60; // safety cap (50 items/page → up to 3000 entries per type)

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
    const platforms: MetadataRoute.Sitemap = [];
    try {
        const res = await getPlatforms();
        for (const p of res.results) {
            platforms.push({
                url: absoluteUrl(`/juegos/${p.slug}`),
                changeFrequency: 'daily',
                priority: 0.9,
            });
        }
    } catch {
        /* ignore */
    }

    const games: MetadataRoute.Sitemap = [];
    try {
        for (let page = 1; page <= MAX_PAGES; page++) {
            const res = await getGames({ page, ordering: '-id' });
            for (const g of res.results) {
                games.push({
                    url: absoluteUrl(`/game/${g.id}`),
                    // `price_updated_at` es lo más cercano a "cuándo cambió
                    // esta ficha": el juego en sí no tiene timestamp, pero lo
                    // que se actualiza de él es su precio.
                    ...(g.price_updated_at ? { lastModified: g.price_updated_at } : {}),
                    changeFrequency: 'daily',
                    priority: 0.8,
                });
            }
            if (!res.next) break;
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
        const res = await getSellers();
        for (const s of res.results) {
            stores.push({
                url: absoluteUrl(`/store/${s.id}`),
                changeFrequency: 'weekly',
                priority: 0.4,
            });
        }
    } catch {
        /* ignore */
    }

    return [...staticRoutes, ...platforms, ...games, ...posts, ...stores];
}
