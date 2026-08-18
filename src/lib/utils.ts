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
    '3ds': { mantine: 'red.8', hex: platforms['3ds'], cssVar: 'var(--mantine-color-red-8)' },
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
};
