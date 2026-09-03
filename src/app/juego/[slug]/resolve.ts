import { ApiError, getGame } from '@/lib/api';
import type { Game } from '@/lib/types';

/** `"dragon-ball-fighterz-13728"` → `{ slug: "dragon-ball-fighterz", id: "13728" }`.
 *  `"13728"` → `{ slug: "", id: "13728" }`. Sin id numérico al final → null. */
export function parseGameSegment(segment: string): { slug: string; id: string } | null {
    const m = /^(?:(.+)-)?(\d+)$/.exec(segment);
    return m ? { slug: m[1] ?? '', id: m[2] } : null;
}

/** `null` solo ante un 404 de la API. Un fallo de red o un 5xx NO es "el juego
 *  no existe": se relanza en vez de convertirlo en silencio en un notFound(). */
export async function fetchGame(id: string): Promise<Game | null> {
    try {
        return await getGame(id);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        console.error(`Failed to fetch game ${id}:`, err);
        throw err;
    }
}
