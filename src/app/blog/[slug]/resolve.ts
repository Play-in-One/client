import { cache } from 'react';
import { ApiError, getPost } from '@/lib/api';
import type { Post } from '@/lib/types';

/** `"mas-info-para-los-juegos-9"` → `{ slug: "mas-info-para-los-juegos", id: "9" }`.
 *  `"9"` → `{ slug: "", id: "9" }`. Sin id numérico al final → null.
 *  Espejo de `parseGameSegment` en `juego/[slug]/resolve.ts`. */
export function parsePostSegment(segment: string): { slug: string; id: string } | null {
    const m = /^(?:(.+)-)?(\d+)$/.exec(segment);
    return m ? { slug: m[1] ?? '', id: m[2] } : null;
}

/**
 * `null` solo ante un 404 de la API. Un fallo de red o un 5xx NO es "el post
 * no existe": se relanza, porque convertirlo en `notFound()` dejaría un 404
 * cacheado por ISR durante 300 s y Google desindexaría el artículo.
 *
 * Memoizado con `cache()` dentro de la petición: `generateMetadata` y el page
 * piden el mismo post, y `getPost` no fija `next.revalidate`, así que la
 * memoización de `fetch` de Next no está garantizada para esta llamada.
 */
export const fetchPost = cache(async (id: string): Promise<Post | null> => {
    try {
        return await getPost(id);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        console.error(`Failed to fetch post ${id}:`, err);
        throw err;
    }
});
