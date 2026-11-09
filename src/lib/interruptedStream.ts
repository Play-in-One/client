/**
 * La respuesta de la página se cortó antes de terminar: recarga o Escape
 * durante la carga, o el servidor la cerró (saturado, o reiniciándose en un
 * deploy). Cada pieza lo reporta con su propio mensaje:
 *
 * - React (`react-server-dom`, `close()` con datos incompletos): `Connection closed.`
 * - Firefox, al leer el cuerpo de un `fetch` cortado: `Error in input stream`
 * - Chrome: `network error` / `Failed to fetch`
 * - Safari: `Load failed` / `The network connection was lost.`
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
];

export function isInterruptedStream(error: Error | undefined): boolean {
    const message = error?.message ?? '';
    return INTERRUPTED.some((known) => message === known || message.startsWith(known));
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
