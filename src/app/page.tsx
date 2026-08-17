import { getPosts, getTrendingGames, getFeaturedGames } from '@/lib/api';
import type { Post, Game } from '@/lib/types';
import HomeClient from './HomeClient';

// Refresh server-rendered news periodically instead of freezing at build time.
export const revalidate = 300;

// Home inherits its title/canonical from the root layout metadata.
export default async function HomePage() {
    // Las tres secciones son independientes: se piden en paralelo (cada
    // regeneración ISR paga 1 RTT al backend en vez de 3 encadenados) y
    // cada una degrada a vacío por separado si el API falla.
    const [postsResult, trendingResult, featuredResult] = await Promise.allSettled([
        getPosts({ page: 1, ordering: '-published_date' }),
        getTrendingGames(),
        getFeaturedGames(),
    ]);

    const posts: Post[] = postsResult.status === 'fulfilled' ? postsResult.value.results : [];
    const trending: Game[] = trendingResult.status === 'fulfilled' ? trendingResult.value.results : [];
    const featured: Game[] = featuredResult.status === 'fulfilled' ? featuredResult.value.results : [];

    return <HomeClient initialPosts={posts} initialTrending={trending} initialFeatured={featured} />;
}
