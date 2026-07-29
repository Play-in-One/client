import type { MetadataRoute } from 'next';
import { getGames, getPosts, getSellers } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';

// Regenerate at most hourly so new games/posts appear without a redeploy.
export const revalidate = 3600;

const MAX_PAGES = 60; // safety cap (50 items/page → up to 3000 entries per type)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
        { url: absoluteUrl('/search'), changeFrequency: 'daily', priority: 0.9 },
        { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.6 },
        { url: absoluteUrl('/about'), changeFrequency: 'yearly', priority: 0.3 },
        { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.3 },
        { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.2 },
    ];

    const games: MetadataRoute.Sitemap = [];
    try {
        for (let page = 1; page <= MAX_PAGES; page++) {
            const res = await getGames({ page, ordering: '-id' });
            for (const g of res.results) {
                games.push({
                    url: absoluteUrl(`/game/${g.id}`),
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

    return [...staticRoutes, ...games, ...posts, ...stores];
}
