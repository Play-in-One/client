import { getPosts, getTrendingGames } from '@/lib/api';
import type { Post, Game } from '@/lib/types';
import HomeClient from './HomeClient';

// Refresh server-rendered news periodically instead of freezing at build time.
export const revalidate = 300;

// Home inherits its title/canonical from the root layout metadata.
export default async function HomePage() {
    let posts: Post[] = [];
    try {
        posts = (await getPosts({ page: 1, ordering: '-published_date' })).results;
    } catch {
        /* render hero without news on API failure */
    }

    let trending: Game[] = [];
    try {
        trending = (await getTrendingGames()).results;
    } catch {
        /* render home without the trending panel on API failure */
    }

    return <HomeClient initialPosts={posts} initialTrending={trending} />;
}
