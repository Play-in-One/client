/** El stream de la página se cortó antes de terminar (recarga, Escape, red
 *  caída): React rechaza lo pendiente con este mensaje exacto
 *  (`react-server-dom`, `close()` con datos incompletos). Ver `app/error.tsx`. */
export function isInterruptedStream(error: Error | undefined): boolean {
    return error?.message === 'Connection closed.';
}
