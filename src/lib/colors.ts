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

export const foregrounds = {
    light: {
        /** Softer than pure black while preserving strong contrast on white. */
        primary: '#222222',
        /** Párrafos secundarios fuera de Mantine (gray-7 del tema). */
        secondary: '#495057',
        /** `--mantine-color-dimmed`. El gray-6 de Mantine daba 3,32:1 sobre blanco. */
        dimmed: '#6b7280',
    },
    dark: {
        /** `--mantine-color-dimmed`. El `darkScale[2]` daba 4,43:1 sobre las tarjetas. */
        dimmed: '#8f8f8f',
    },
};

/** Rojo de marca como TEXTO (`--pio-brand-text`): precios, etiquetas, títulos de
 *  sección. El tono 5 daba 3,95:1 sobre blanco y 4,31:1 sobre las tarjetas
 *  oscuras; se queda para botones y para el logotipo, que no son texto corrido. */
export const brandText = {
    light: 'var(--mantine-color-primaryRed-6)',
    dark: 'var(--mantine-color-primaryRed-4)',
};

/** Texto de la variante `light` de Badge, Button y Alert en modo claro, donde
 *  Mantine usa el tono 6 sobre un tinte de ese mismo color. En oscuro ya cumple.
 *  El verde va fuera de la paleta: su tono más oscuro solo llega a 4,03:1. */
export const lightVariantText = {
    success: '#1f7a33',
    info: 'var(--mantine-color-info-9)',
    blue: 'var(--mantine-color-blue-9)',
    danger: 'var(--mantine-color-danger-9)',
    gray: 'var(--mantine-color-gray-7)',
    primaryRed: 'var(--mantine-color-primaryRed-7)',
    /* Amarillo y naranja también fuera de la paleta: sus tonos 9 no llegan a 4,5:1
       sobre su propio tinte. `yellow` es la insignia «Usado» y el botón de reportar. */
    yellow: '#ad5a00',
    warning: '#ad5a00',
    orange: '#b04a00',
    caution: '#b04a00',
    grape: 'var(--mantine-color-grape-9)',
    teal: 'var(--mantine-color-teal-9)',
};

export const surfaces = {
    light: {
        navbar: 'rgba(255, 255, 255, 0.9)',
        conditionSwitchTrack: 'var(--mantine-color-gray-1)',
        heroSearchBar: '#fff',
        /** page/body background — feeds `--mantine-color-body` */
        body: '#ffffff',
        scrollbarThumb: '#cbd5e1',
        skeletonShine: 'rgba(255, 255, 255, 0.65)',
    },
    dark: {
        navbar: 'rgba(15, 15, 15, 0.9)',
        conditionSwitchTrack: 'var(--mantine-color-dark-5)',
        heroSearchBar: 'var(--mantine-color-dark-7)',
        /** page/body background — feeds `--mantine-color-body` */
        body: 'var(--mantine-color-dark-7)',
        scrollbarThumb: 'var(--mantine-color-dark-4)',
        skeletonShine: 'rgba(255, 255, 255, 0.12)',
    },
    /* Tono 6: el texto blanco del activo daba 3,95:1 sobre el 5. */
    conditionIndicator: 'var(--mantine-color-primaryRed-6)',
    conditionGlow: '0 0 14px rgba(240, 47, 104, 0.65), 0 0 0 1px rgba(240, 47, 104, 0.35)',
    /** dark-mode tint paired with `var(--mantine-color-gray-0)` for alternating page sections */
    altSectionTint: 'rgba(0, 0, 0, 0.2)',
    /** slightly stronger tint used behind the platform selector on the game detail page */
    altSectionTintStrong: 'rgba(0, 0, 0, 0.3)',
};

export const decorative = {
    heroBlobRed: 'rgba(240, 47, 104, 0.1)',
    heroBlobBlue: 'rgba(59, 130, 246, 0.1)',
    /* Realce bajo los botones primarios: es el propio color del botón difuminado,
       así que vive aquí y no suelto en el JSX. Estaba escrito a mano en dos sitios
       con el rojo anterior a la paleta Signature Red, y por eso sobrevivió al
       cambio sin que nadie lo viera. La versión `strong` es la de la ficha, sobre
       la tarjeta oscura de "Mejor precio", donde la sutil no se aprecia. */
    primaryButtonShadow: '0 4px 14px rgba(240, 47, 104, 0.25)',
    primaryButtonShadowStrong: '0 8px 25px rgba(240, 47, 104, 0.3)',
    bestPriceCardGradient: {
        light: { from: '#6e3a59', to: '#8e5b68' },
        dark: { from: '#1F2937', to: '#111827' },
    },
};

/* Los colores por consola vivían aquí y se retiraron: ahora son un campo del
   catálogo (`lib/platforms.ts`), junto al icono y las etiquetas de cada una.
   Este archivo lo importa el tema global, así que derivarlos desde el catálogo
   habría arrastrado los iconos de las consolas a todos los bundles. Tres de
   aquellos colores (`3ds`, `wiiu`, `psvita`) llevaban tiempo muertos, porque
   `PLATFORM_COLORS` los pisaba con el hex de otra consola. */

/* Colores de estado. Son alias de paletas de Mantine que el tema registra con
   este nombre (`color="danger"`, `c="success"`), para que el rojo de un error no
   se confunda con el rojo de la marca: los dos se escribían `red` y no había
   forma de distinguir cuál era cuál. `primaryRed` es la marca; esto, el estado. */
export const semantic = {
    /** Errores, acciones destructivas, campo obligatorio. */
    danger: 'red',
    /** Confirmaciones, "guardado", ahorro. */
    success: 'green',
    /** Falta algo para continuar (iniciar sesión, sin datos todavía). */
    warning: 'yellow',
    /** Acciones con efecto amplio que conviene pensar (fusionar) y datos incompletos. */
    caution: 'orange',
    info: 'blue',
} as const;

export type SemanticColor = keyof typeof semantic;

/** Sombras de elevación. `shadow="sm"` y compañía siguen siendo las de Mantine;
 *  estas son las que el hover y los elementos flotantes escribían a mano. */
export const elevation = {
    /** Barra de búsqueda de la portada. */
    raised: '0 8px 30px rgba(0, 0, 0, 0.08)',
    /** Hover de toda tarjeta clicable; lo aplica la clase `.pio-lift` vía
     *  `--pio-shadow-hover`, no se escribe en el componente. */
    hover: '0 12px 40px rgba(0, 0, 0, 0.15)',
    /** Portada de la ficha. */
    cover: '0 20px 60px rgba(0, 0, 0, 0.25)',
};

/** Velos negros sobre imágenes (portadas): lo que deja leer un icono o una cifra
 *  encima de una foto cuyo color no se conoce. */
export const scrim = {
    soft: 'rgba(0, 0, 0, 0.28)',
    medium: 'rgba(0, 0, 0, 0.52)',
    base: 'rgba(0, 0, 0, 0.55)',
    strong: 'rgba(0, 0, 0, 0.65)',
};

/** Texto y líneas sobre superficies que son oscuras en los dos temas (la
 *  tarjeta de "Mejor precio", el aviso de cookies, los botones sobre portada). */
export const onDark = {
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.78)',
    /** Textos de apoyo de la tarjeta de mejor precio. Sobre su degradado claro,
     *  al 70 % daban 3,6:1 y al 50 %, 2,6:1. */
    textSecondary: 'rgba(255, 255, 255, 0.9)',
    textLabel: 'rgba(255, 255, 255, 0.65)',
    separator: 'rgba(255, 255, 255, 0.85)',
    /** Confirmaciones sobre la tarjeta de mejor precio: el verde 4 da 3,1:1 sobre
     *  su degradado en modo claro. */
    success: 'light-dark(var(--mantine-color-success-1), var(--mantine-color-success-4))',
    hover: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderMedium: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
};

/** Estrella dorada junto a una nota sobre la superficie de una tarjeta (la
 *  destacada). En claro es un dorado más oscuro: el `#f5b400` de siempre daba
 *  1,8:1 sobre blanco, bajo el 3:1 que pide un icono; este da 3,25:1. En
 *  oscuro el brillante da 9:1 y se queda. Sobre una portada se usa
 *  `RatingPill`, que colorea la estrella por nota. */
export const ratingStar = { light: '#b8860b', dark: '#f5b400' };

/** Paleta categórica de gráficos: tonos con nombre, no índices, para que cada
 *  serie conserve su color aunque cambie el orden en que se pinta. */
const series = {
    violet: '#7C3AED',
    purple: '#8B5CF6',
    indigo: '#6366F1',
    blue: '#2563EB',
    sky: '#0EA5E9',
    cyan: '#06B6D4',
    teal: '#14B8A6',
    green: '#22C55E',
    yellow: '#EAB308',
    amber: '#F59E0B',
    orange: '#F97316',
    red: '#EF4444',
    gray: '#6B7280',
};

export const chart = {
    tooltipBg: { light: '#fff', dark: '#1c1c1c' },
    tooltipText: { light: '#1F2937', dark: '#ffffff' },
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
    /** Etiquetas de los ejes del gráfico de precio (mismo gris en los dos temas). */
    tick: '#9CA3AF',
    /** Ejes y rejilla del dashboard interno. */
    axis: { light: '#868e96', dark: '#909296' },
    /** Línea vertical que separa el dato medido de la extensión hasta hoy. */
    referenceLine: { light: 'rgba(31, 41, 55, 0.35)', dark: 'rgba(255, 255, 255, 0.35)' },
    pointFill: '#ffffff',
    series,
    /** Orden de asignación cuando las series no tienen identidad propia (tiendas). */
    sequence: [series.violet, series.blue, series.indigo, series.orange, series.red, series.green, series.yellow, series.teal],
    /** Grupos de canal del panel de fuentes. Validada con el validador de
     *  dataviz en claro y oscuro: no cambiar un tono sin volver a validarla. */
    channels: {
        search: { light: '#2a78d6', dark: '#3987e5' },
        paid: { light: '#eb6834', dark: '#d95926' },
        social: { light: '#1baf7a', dark: '#199e70' },
        direct: { light: '#eda100', dark: '#c98500' },
        other: { light: '#e87ba4', dark: '#d55181' },
        unknown: { light: '#adb5bd', dark: '#5c5f66' },
    },
};

/** Fondo de los avatares con iniciales de la tabla de ofertas, bajo texto blanco.
 *  Índigo y naranja van más oscuros que en `chart.series` para llegar a 4,5:1. */
export const sellerAvatarColors = [series.violet, series.blue, '#4F46E5', series.gray, '#C2410C'];

/** Confeti de la encuesta completada; el primero es el color de la marca. */
export const confettiColors = ['var(--mantine-primary-color-filled)', '#ffca57', '#4ecdc4', '#8f80ff', '#ff8c69'];

/** Color semántico según la nota (0-10): éxito/aviso/precaución/peligro. Único
 *  criterio de color para toda calificación de la ficha — el badge agregado
 *  (`GameDetailClient`) y cada gauge por fuente (`RatingGauge`) comparten esta
 *  función para no tener dos escalas de color divergentes. Devuelve el nombre
 *  de una paleta del tema, así que sirve tanto para `color=` como para armar
 *  `var(--mantine-color-<nombre>-5)`. */
export function ratingColor(value: number): SemanticColor | 'gray' {
    if (!Number.isFinite(value)) return 'gray';
    if (value >= 8) return 'success';
    if (value >= 6) return 'warning';
    if (value >= 4) return 'caution';
    return 'danger';
}

export const social = {
    instagram: '#E1306C',
    facebook: '#1877F2',
    tiktok: '#ff0050',
    youtube: '#FF0000',
    linkedin: '#0A66C2',
    reddit: '#FF4500',
    pinterest: '#E60023',
    gmail: '#EA4335',
    discord: '#5865F2',
    spotify: '#1DB954',
    whatsapp: '#25D366',
    threads: '#000000',
    tumblr: '#36465D',
    telegram: '#26A5E4',
};

export const og = {
    gradient: { from: '#0f172a', via: '#1e293b', to: '#7f1d1d' },
    subtitle: '#cbd5e1',
};

export const pwa = {
    backgroundColor: '#ffffff',
    /* Tiñe la barra del navegador en móvil al instalar la PWA: es lo primero
       que se ve de la marca, y seguía en el rojo viejo. */
    themeColor: brand.primary,
};
