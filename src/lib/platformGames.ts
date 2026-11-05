import { getGames } from '@/lib/api';

/** The order of the per-console landing (`/juegos/<slug>`). */
export const LANDING_ORDERING = '-traffic_score,name';
export const LANDING_PAGE_SIZE = 24;

/** How many games the console's landing lists. Uses the landing's own first
 *  page request (same params), so on the server it shares its Data Cache
 *  entry, and the number is the one the visitor sees after the click; the
 *  platform's `game_count` also counts games without stock. */
export async function platformGameCount(platformId: number, options?: { revalidate?: number; signal?: AbortSignal }): Promise<number> {
    const res = await getGames({ page_size: LANDING_PAGE_SIZE, platforms: [platformId], ordering: LANDING_ORDERING, page: 1, ...options });
    return res.count;
}
