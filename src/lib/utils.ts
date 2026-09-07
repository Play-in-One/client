import { platforms } from '@/lib/colors';

/** Utility: format Chilean peso */
export function formatCLP(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
}

/**
 * ── Colores oficiales por consola ──
 * Fuente única de verdad para todos los contextos.
 *   • mantine  → para props `color` de componentes Mantine (Badge, Button…)
 *   • hex      → para estilos inline / CSS custom que requieran hex (ver lib/colors.ts)
 *   • cssVar   → variable CSS Mantine resuelta (ej.: cards de la home)
 */
export const PLATFORM_COLORS: Record<string, { mantine: string; hex: string; cssVar: string }> = {
    ps3: { mantine: 'gray.7', hex: platforms.ps3, cssVar: 'var(--mantine-color-gray-7)' },
    ps4: { mantine: 'indigo', hex: platforms.ps4, cssVar: 'var(--mantine-color-indigo-filled)' },
    ps5: { mantine: 'blue', hex: platforms.ps5, cssVar: 'var(--mantine-color-blue-filled)' },
    xbox: { mantine: 'green', hex: platforms.xbox, cssVar: 'var(--mantine-color-green-filled)' },
    xbox360: { mantine: 'green', hex: platforms.xbox360, cssVar: 'var(--mantine-color-green-filled)' },
    xboxone: { mantine: 'green', hex: platforms.xboxone, cssVar: 'var(--mantine-color-green-filled)' },
    xboxseries: { mantine: 'green', hex: platforms.xboxseries, cssVar: 'var(--mantine-color-green-filled)' },
    switch: { mantine: 'red', hex: platforms.switch, cssVar: 'var(--mantine-color-red-filled)' },
    switch2: { mantine: 'red', hex: platforms.switch2, cssVar: 'var(--mantine-color-red-filled)' },
    pc: { mantine: 'gray', hex: platforms.pc, cssVar: 'var(--mantine-color-gray-filled)' },
    wii: { mantine: 'cyan', hex: platforms.wii, cssVar: 'var(--mantine-color-cyan-filled)' },
    nds: { mantine: 'gray.7', hex: platforms.nds, cssVar: 'var(--mantine-color-gray-7)' },
    '3ds': { mantine: 'gray.7', hex: platforms.nds, cssVar: 'var(--mantine-color-gray-7)' },
    wiiu: { mantine: 'cyan', hex: platforms.wii, cssVar: 'var(--mantine-color-cyan-filled)' },
    psvita: { mantine: 'indigo', hex: platforms.ps4, cssVar: 'var(--mantine-color-indigo-filled)' },
};

/** Alias corto para labels de plataforma (ej. badges de la galería) cuando difiere del display_name del backend */
export const PLATFORM_LABEL_OVERRIDES: Record<string, string> = {
    psvita: 'PSV',
    xbox360: 'X360',
    xboxone: 'XOne',
    xboxseries: 'XSeries',
    nds: 'NDS',
    '3ds': 'N3DS',
    switch: 'sw',
    switch2: 'sw2',
};

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
