/**
 * La carga de la página se cortó antes de terminar: recarga, Escape o el botón
 * de recargar de la barra —que MIENTRAS CARGA es la X de "detener"—, o el
 * servidor cerró la respuesta (saturado, o reiniciándose en un deploy). Cada
 * pieza lo reporta con su propio mensaje:
 *
 * - React (`react-server-dom`, `close()` con datos incompletos): `Connection closed.`
 * - Firefox, al leer el cuerpo de un `fetch` cortado: `Error in input stream`
 * - Chrome: `network error` / `Failed to fetch`
 * - Safari: `Load failed` / `The network connection was lost.`
 * - webpack, si el corte aborta un chunk de la ruta: `Loading chunk 3465 failed.`
 *   (y `Loading CSS chunk …`)
 *
 * Detener la carga también deja errores que NO dicen nada de la red: con un
 * chunk abortado, el módulo de un componente queda sin definir y React lanza
 * el #130 ("Element type is invalid … got: undefined"). Para esos sirve la
 * marca de `StaleChunkReload` (ver `assetFailedRecently`).
 *
 * Ver `app/error.tsx` y `app/global-error.tsx`.
 */
const INTERRUPTED = [
    'Connection closed.',
    'Error in input stream',
    'network error',
    'Failed to fetch',
    'Load failed',
    'The network connection was lost.',
    'Loading chunk',
    'Loading CSS chunk',
];

export function isInterruptedStream(error: Error | undefined): boolean {
    if (error?.name === 'ChunkLoadError') return true;
    const message = error?.message ?? '';
    return INTERRUPTED.some((known) => message === known || message.startsWith(known));
}

/** Dónde deja `StaleChunkReload` el instante del último archivo de
 *  `/_next/static/` que no cargó (404 o abortado). En `window` y no en
 *  `sessionStorage`: solo importa para ESTE documento. */
export const ASSET_FAILED_KEY = '__pioAssetFailedAt';

/** Ventana en la que un error de render se atribuye a un archivo que no cargó. */
const ASSET_FAILURE_WINDOW_MS = 30_000;

/** Un archivo de la app no cargó hace poco en este documento. Un error de
 *  render en ese momento es consecuencia del módulo que falta, no un fallo de
 *  la página: solo lo arregla un documento nuevo. */
export function assetFailedRecently(now = Date.now(), win: unknown = typeof window === 'undefined' ? undefined : window): boolean {
    const at = Number((win as Record<string, unknown> | undefined)?.[ASSET_FAILED_KEY] ?? 0);
    return at > 0 && now - at < ASSET_FAILURE_WINDOW_MS;
}

/** La carga de la página se cortó: por el mensaje del error o porque un
 *  archivo de la app no llegó a cargar. */
export function isInterruptedLoad(error: Error | undefined): boolean {
    return isInterruptedStream(error) || assetFailedRecently();
}

const RELOAD_KEY = 'pio-interrupted-reload';

/** Recarga la página una vez para recuperar una carga cortada. Como
 *  `StaleChunkReload`: como máximo una vez por minuto en la pestaña, para no
 *  entrar en un bucle si el servidor de verdad no responde. Devuelve si
 *  recargó. */
export function reloadOnceAfterInterruption(): boolean {
    try {
        const now = Date.now();
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (now - last < 60_000) return false;
        sessionStorage.setItem(RELOAD_KEY, String(now));
    } catch {
        return false;
    }
    window.location.reload();
    return true;
}
