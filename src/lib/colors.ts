import type { MantineColorsTuple } from '@mantine/core';

/**
 * Single source of truth for every background color used across the app.
 * Change a value here to change it everywhere it's used.
 */

export const brand = {
    /** "Signature Red" — 10-shade Mantine palette, index 5 is primary */
    primaryScale: [
        '#ffe4ed',
        '#ffc8d9',
        '#fa9ab6',
        '#f66891',
        '#f34173',
        '#f02f68',
        '#d8235a',
        '#be1b4d',
        '#a41641',
        '#8c0f33',
    ] as MantineColorsTuple,
    primary: '#f02f68',
};

/**
 * Paleta `dark` — sobreescribe la de Mantine para un modo oscuro más profundo
 * (estilo Material dark, fondo #121212).
 * Índices 0–3 = texto (legibilidad); 4–9 = superficies (más oscuras).
 */
export const darkScale: MantineColorsTuple = [
    '#C9C9C9', // 0  texto principal
    '#b8b8b8', // 1  texto secundario
    '#828282', // 2  dimmed
    '#696969', // 3  placeholder/disabled
    '#2e2e2e', // 4  bordes  (--mantine-color-default-border)
    '#242424', // 5  hover / superficies sutiles
    '#1c1c1c', // 6  tarjetas (Card, content-card, blog)
    '#121212', // 7  fondo de página (--mantine-color-body)
    '#0d0d0d', // 8  más profundo
    '#080808', // 9  el más profundo
];

export const surfaces = {
    light: {
        navbar: 'rgba(255, 255, 255, 0.9)',
        conditionSwitchTrack: 'var(--mantine-color-gray-1)',
        heroSearchBar: '#fff',
        /** page/body background — feeds `--mantine-color-body` */
        body: '#ffffff',
    },
    dark: {
        navbar: 'rgba(15, 15, 15, 0.9)',
        conditionSwitchTrack: 'var(--mantine-color-dark-5)',
        heroSearchBar: 'var(--mantine-color-dark-7)',
        /** page/body background — feeds `--mantine-color-body` */
        body: 'var(--mantine-color-dark-7)',
    },
    conditionIndicator: 'var(--mantine-color-primaryRed-5)',
    conditionGlow: '0 0 14px rgba(240, 47, 104, 0.65), 0 0 0 1px rgba(240, 47, 104, 0.35)',
    /** dark-mode tint paired with `var(--mantine-color-gray-0)` for alternating page sections */
    altSectionTint: 'rgba(0, 0, 0, 0.2)',
    /** slightly stronger tint used behind the platform selector on the game detail page */
    altSectionTintStrong: 'rgba(0, 0, 0, 0.3)',
};

export const decorative = {
    heroBlobRed: 'rgba(230, 57, 70, 0.1)',
    heroBlobBlue: 'rgba(59, 130, 246, 0.1)',
    bestPriceCardGradient: {
        light: { from: '#6e3a59', to: '#8e5b68' },
        dark: { from: '#1F2937', to: '#111827' },
    },
};

/**
 * Colores oficiales por consola — fuente única de verdad.
 * Usado por lib/utils.ts (PLATFORM_COLORS.hex) y lib/platformGroups.ts (PLATFORM_GROUPS[].color).
 */
export const platforms: Record<string, string> = {
    ps3: '#52525B',
    ps4: '#1E40AF',
    ps5: '#2563EB',
    xbox: '#16A34A',
    xbox360: '#16A34A',
    xboxone: '#16A34A',
    xboxseries: '#16A34A',
    switch: '#DC2626',
    switch2: '#EF4444',
    pc: '#6B7280',
    wii: '#00AEEF',
    nds: '#4B4B4B',
    '3ds': '#C0001B',
    wiiu: '#009AC7',
    psvita: '#7C3AED',
};

export const chart = {
    tooltipBg: { light: '#fff', dark: '#1c1c1c' },
};

export const social = {
    instagram: '#E1306C',
    facebook: '#1877F2',
    tiktok: '#ff0050',
    youtube: '#FF0000',
};

export const og = {
    gradient: { from: '#0f172a', via: '#1e293b', to: '#7f1d1d' },
};

export const pwa = {
    backgroundColor: '#ffffff',
    themeColor: '#E63946',
};
