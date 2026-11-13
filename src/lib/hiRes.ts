/** Conexión del navegador (Network Information API; no está en `lib.dom`). */
export interface HiResConnection {
    saveData?: boolean;
    effectiveType?: string;
}

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);

/**
 * ¿Vale la pena pedir la versión de alta calidad de una portada después de la
 * carga? No cuando no hay portada real (marcador), ni con ahorro de datos o
 * una conexión 2G: ahí se queda la imagen que ya se pintó.
 */
export function shouldUpgradeCover(src: string | null | undefined, connection?: HiResConnection | null): boolean {
    if (!src || src.startsWith('/placeholder')) return false;
    if (connection?.saveData) return false;
    return !(connection?.effectiveType && SLOW_CONNECTIONS.has(connection.effectiveType));
}
