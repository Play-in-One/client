import { getPosts } from '@/lib/api';
import { buildRss, emptyRss } from '@/lib/rss';

// ISR igual que el listado: el feed se regenera cada 5 min.
export const revalidate = 300;

const HEADERS = { 'Content-Type': 'application/rss+xml; charset=utf-8' };

export async function GET() {
    try {
        const { results } = await getPosts({ ordering: '-published_date', revalidate });
        return new Response(buildRss(results.slice(0, 20)), { headers: HEADERS });
    } catch {
        // Nunca un 500 para un crawler: canal vacío y válido, y se reintenta
        // en la próxima regeneración.
        return new Response(emptyRss(), { headers: HEADERS });
    }
}
