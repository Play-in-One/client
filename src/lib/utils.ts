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
