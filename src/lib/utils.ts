import { PLATFORMS } from '@/lib/platforms';

/** Utility: format Chilean peso. Un precio de 0 se anuncia como "Gratis". */
export function formatCLP(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === 0) return 'Gratis';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
}

/** Fragmento de precio para frases tipo "X ${priceClause(precio)}": "a $12.000" o "gratis". */
export function priceClause(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num === 0 ? 'gratis' : `a ${formatCLP(value)}`;
}

/**
 * ── Colores oficiales por consola ──
 * Derivado del catálogo (`lib/platforms.ts`), que es la fuente única.
 *   • mantine  → para props `color` de componentes Mantine (Badge, Button…)
 *   • hex      → para estilos inline / CSS custom que requieran hex
 *   • cssVar   → variable CSS Mantine resuelta (ej.: cards de la home)
 */
export const PLATFORM_COLORS: Record<string, { mantine: string; hex: string; cssVar: string }> =
    Object.fromEntries(
        PLATFORMS.map((p) => [p.slug, { mantine: p.mantine, hex: p.hex, cssVar: p.cssVar }]),
    );

/** Etiqueta del badge de la galería: el mismo abreviado que usan los
 * selectores, pintado en mayúsculas por el Badge. Tenía tabla propia y por eso
 * podía contradecir a la del selector — "NDS" aquí y "DS" allá. */
export const PLATFORM_LABEL_OVERRIDES: Record<string, string> = Object.fromEntries(
    PLATFORMS.map((p) => [p.slug, p.short]),
);

/**
 * Cuántas tarjetas muestra la sección "Otros juegos populares" de la ficha.
 *
 * Vive aquí y no en `PopularGamesSection` porque ese módulo es `'use client'`:
 * lo que un Server Component importa de un módulo cliente NO es el valor, es
 * una referencia de módulo. Exportada desde allá, esta constante llegaba a
 * `page.tsx` como `undefined` y `sampleBy` devolvía una lista vacía sin error —
 * la sección simplemente no se renderizaba.
 */
export const POPULAR_SAMPLE_SIZE = 4;

/**
 * `count` elementos al azar, sin repetir y sin mutar la entrada.
 *
 * El muestreo vive aquí y no en el backend a propósito: `/api/games/popular/`
 * devuelve una lista ESTABLE, y por eso su respuesta se cachea en Redis, en el
 * Data Cache de Next y en el navegador. Sortear en el servidor haría cada
 * respuesta distinta y perdería los tres niveles de caché a la vez.
 */
export function sampleBy<T extends { id: number }>(
    items: T[],
    count: number,
    excludeId?: number,
): T[] {
    const pool = excludeId == null ? [...items] : items.filter((it) => it.id !== excludeId);
    // Fisher-Yates PARCIAL: solo se baraja el prefijo que se va a devolver, no
    // los 40 elementos enteros.
    const take = Math.min(count, pool.length);
    for (let i = 0; i < take; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, take);
}
