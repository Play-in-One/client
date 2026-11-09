import { cache } from 'react';
import { cookies } from 'next/headers';
import { ApiError, getGame, getGamePreview } from '@/lib/api';
import { PREFS_COOKIE, conditionParamFor, parsePrefs, sellerLocationsFor, type Prefs } from '@/lib/prefs';
import type { Game } from '@/lib/types';

import { parseGameSegment } from '@/lib/seo';

/* Vive en `lib/seo.ts`, junto a `gamePath`, para que lo lea también el
   `loading.tsx` de cliente; se re-exporta para los imports del servidor. */
export { parseGameSegment };

/** `null` solo ante un 404 de la API. Un fallo de red o un 5xx NO es "el juego
 *  no existe": se relanza en vez de convertirlo en silencio en un notFound(). */
export const fetchGame = cache(async (id: string): Promise<Game | null> => {
    try {
        return await getGame(id, { summary: process.env.CATALOG_LIGHT_DETAIL_ENABLED === '1' });
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        console.error(`Failed to fetch game ${id}:`, err);
        throw err;
    }
});

/** Separate lightweight read for the first streamed frame and HTTP status. */
export const fetchGamePreview = cache(async (id: string, platform?: string, condition?: string, seller_locations?: string) => {
    try {
        return await getGamePreview(id, { platform, condition, seller_locations });
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
});

/**
 * La lectura del preview que comparten `generateMetadata` y el page.
 *
 * `fetchGamePreview` está memoizado por sus argumentos EXACTOS: la metadata
 * pedía `(id)` y el page `(id, platform, condition, seller_locations)`, dos
 * entradas distintas y dos viajes al backend por cada ficha. Construyendo los
 * argumentos solo aquí, la metadata (que corre en paralelo al layout) arranca
 * la petición y el page recibe la misma promesa. El layout de un documento
 * sigue leyendo `(id)`: no ve `searchParams`, y solo decide el status.
 */
export async function readGamePreview(
    segment: string,
    searchParams: Promise<{ platform?: string | string[] }>,
) {
    const parsed = parseGameSegment(segment);
    if (!parsed) return null;
    const raw = (await searchParams).platform;
    const platform = Array.isArray(raw) ? raw[0] : raw;
    const prefs = parsePrefs((await cookies()).get(PREFS_COOKIE)?.value);
    const preview = await fetchGamePreview(parsed.id, platform,
        conditionParamFor(prefs.format, prefs.condition, prefs.digital), sellerLocationsFor(prefs));
    return { parsed, platform, prefs, preview } satisfies {
        parsed: { slug: string; id: string }; platform?: string; prefs: Prefs; preview: unknown;
    };
}

/** Arranca la ficha completa sin esperarla. `fetchGame` está memoizado en la
 *  petición: quien la espere después recibe esta misma promesa, y el detalle
 *  (la lectura lenta) deja de empezar recién cuando el preview termina. El
 *  `catch` vacío solo evita un rechazo sin manejar si nadie llega a esperarla
 *  (un 404 o un 308 cortan el render antes); el error lo ve `CompleteGame`. */
export function startGameFetch(id: string): void {
    fetchGame(id).catch(() => {});
}
