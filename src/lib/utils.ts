/** Utility: format Chilean peso */
export function formatCLP(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
}

/**
 * ── Colores oficiales por consola ──
 * Fuente única de verdad para todos los contextos.
 *   • mantine  → para props `color` de componentes Mantine (Badge, Button…)
 *   • hex      → para estilos inline / CSS custom que requieran hex
 *   • cssVar   → variable CSS Mantine resuelta (ej.: cards de la home)
 */
export const PLATFORM_COLORS: Record<string, { mantine: string; hex: string; cssVar: string }> = {
    ps3: { mantine: 'gray.7', hex: '#52525B', cssVar: 'var(--mantine-color-gray-7)' },
    ps4: { mantine: 'indigo', hex: '#1E40AF', cssVar: 'var(--mantine-color-indigo-filled)' },
    ps5: { mantine: 'blue', hex: '#2563EB', cssVar: 'var(--mantine-color-blue-filled)' },
    xbox: { mantine: 'green', hex: '#16A34A', cssVar: 'var(--mantine-color-green-filled)' },
    xbox360: { mantine: 'green', hex: '#16A34A', cssVar: 'var(--mantine-color-green-filled)' },
    xboxone: { mantine: 'green', hex: '#16A34A', cssVar: 'var(--mantine-color-green-filled)' },
    xboxseries: { mantine: 'green', hex: '#16A34A', cssVar: 'var(--mantine-color-green-filled)' },
    switch: { mantine: 'red', hex: '#DC2626', cssVar: 'var(--mantine-color-red-filled)' },
    switch2: { mantine: 'red', hex: '#EF4444', cssVar: 'var(--mantine-color-red-filled)' },
    pc: { mantine: 'gray', hex: '#6B7280', cssVar: 'var(--mantine-color-gray-filled)' },
    wii: { mantine: 'cyan', hex: '#00AEEF', cssVar: 'var(--mantine-color-cyan-filled)' },
    nds: { mantine: 'gray.7', hex: '#4B4B4B', cssVar: 'var(--mantine-color-gray-7)' },
    '3ds': { mantine: 'red.8', hex: '#C0001B', cssVar: 'var(--mantine-color-red-8)' },
    wiiu: { mantine: 'teal', hex: '#009AC7', cssVar: 'var(--mantine-color-teal-filled)' },
};
