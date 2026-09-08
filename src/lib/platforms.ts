import type { ComponentType } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import {
    IconBrandWindows,
    IconBrandApple,
    IconBrandUbuntu,
    IconDeviceGamepad,
} from '@tabler/icons-react';
import { WiiULogo, WiiLogo, NintendoDSLogo } from '@/components/icons/PlatformLogos';

/**
 * ── Catálogo de consolas: la ÚNICA fuente de verdad del cliente ──
 *
 * Todo lo que la interfaz sabe de una consola sale de aquí: su icono, su color
 * en los tres formatos que consume Mantine, sus tres etiquetas y la familia por
 * la que se agrupa el menú. Los diccionarios que exportan `platformIcons.ts`,
 * `utils.ts`, `colors.ts` y `platformGroups.ts` se derivan de este array.
 *
 * Antes eran seis tablas independientes indexadas por string, y **ninguna
 * omisión rompía el build**: una consola que faltara aparecía como gamepad
 * gris, sin nombre largo y ausente del Navbar, el Footer y la home. `xbox` y
 * `pc` llevaban así desde siempre — existían en el backend y no en el menú.
 *
 * `slug` es el del backend (`Develop/backend/games/platforms.py`) y es la clave
 * de todo: el routing (`/juegos/<slug>`), el filtro (`?platform=<slug>`) y estos
 * mapas. Los mapas se indexaban por `Platform.name`, que el backend mantiene
 * idéntico al slug por contrato, pero eran dos claves distintas para lo mismo.
 *
 * `featured` marca las consolas que nombra la etiqueta de su familia y acota el
 * filtro de la tarjeta de la home: esa tarjeta sólo muestra el texto del grupo,
 * así que no puede filtrar por consolas que el texto no menciona.
 */
export interface PlatformDef {
    slug: string;
    /**
     * ABREVIADO. Uno solo, para todo lo que va estrecho: la insignia de la
     * galería (que lo pinta en mayúsculas) y los selectores de consola.
     * Espejo del `display_name` que publica la API.
     */
    short: string;
    /** LARGO. Títulos, menús y todo lo que se lee de corrido. */
    long: string;
    icon: ComponentType<{ size?: number; className?: string; color?: string }>;
    /** Color oficial de la marca. */
    hex: string;
    /** Nombre de color de Mantine, para props `color`. */
    mantine: string;
    /** Variable CSS de Mantine ya resuelta (tarjetas de la home). */
    cssVar: string;
    family: PlatformFamily;
    featured?: boolean;
}

export type PlatformFamily = 'playstation' | 'xbox' | 'nintendo' | 'pc';

const GRAY_7 = 'var(--mantine-color-gray-7)';

/* La lista literal existe para derivar de ella el tipo `PlatformSlug`. Se
   consume a través de `PLATFORMS`, que es la misma lista con el tipo ancho:
   sobre el literal, TypeScript no deja leer `menu` en las entradas que no lo
   declaran. El orden es el del menú: cronológico dentro de cada familia. */
const CATALOG = [
    {
        slug: 'ps3', short: 'PS3', long: 'PlayStation 3',
        icon: FaPlaystation, hex: '#52525B', mantine: 'gray.7', cssVar: GRAY_7,
        family: 'playstation',
    },
    {
        slug: 'ps4', short: 'PS4', long: 'PlayStation 4',
        icon: FaPlaystation, hex: '#1E40AF', mantine: 'indigo',
        cssVar: 'var(--mantine-color-indigo-filled)',
        family: 'playstation', featured: true,
    },
    {
        slug: 'ps5', short: 'PS5', long: 'PlayStation 5',
        icon: FaPlaystation, hex: '#2563EB', mantine: 'blue',
        cssVar: 'var(--mantine-color-blue-filled)',
        family: 'playstation', featured: true,
    },
    {
        // El hex de marca de PS Vita es morado, pero la insignia se ha visto
        // siempre con el índigo de PS4; cambiarlo aquí cambiaría la UI.
        slug: 'psvita', short: 'PSV', long: 'PlayStation Vita',
        icon: FaPlaystation, hex: '#1E40AF', mantine: 'indigo',
        cssVar: 'var(--mantine-color-indigo-filled)',
        family: 'playstation',
    },
    {
        slug: 'xbox', short: 'Xbox', long: 'Xbox',
        icon: FaXbox, hex: '#16A34A', mantine: 'green',
        cssVar: 'var(--mantine-color-green-filled)',
        family: 'xbox',
    },
    {
        slug: 'xbox360', short: 'X360', long: 'Xbox 360',
        icon: FaXbox, hex: '#16A34A', mantine: 'green',
        cssVar: 'var(--mantine-color-green-filled)',
        family: 'xbox', featured: true,
    },
    {
        slug: 'xboxone', short: 'XOne', long: 'Xbox One',
        icon: FaXbox, hex: '#16A34A', mantine: 'green',
        cssVar: 'var(--mantine-color-green-filled)',
        family: 'xbox', featured: true,
    },
    {
        slug: 'xboxseries', short: 'XSeries', long: 'Xbox Series',
        icon: FaXbox, hex: '#16A34A', mantine: 'green',
        cssVar: 'var(--mantine-color-green-filled)',
        family: 'xbox', featured: true,
    },
    {
        slug: 'ds', short: 'DS', long: 'Nintendo DS',
        icon: NintendoDSLogo, hex: '#4B4B4B', mantine: 'gray.7', cssVar: GRAY_7,
        family: 'nintendo',
    },
    {
        slug: 'wii', short: 'Wii', long: 'Nintendo Wii',
        icon: WiiLogo, hex: '#00AEEF', mantine: 'cyan',
        cssVar: 'var(--mantine-color-cyan-filled)',
        family: 'nintendo',
    },
    {
        // Mismo caso que PS Vita: el gris de DS es el que está en pantalla.
        slug: '3ds', short: '3DS', long: 'Nintendo 3DS',
        icon: NintendoDSLogo, hex: '#4B4B4B', mantine: 'gray.7', cssVar: GRAY_7,
        family: 'nintendo',
    },
    {
        slug: 'wiiu', short: 'WiiU', long: 'Nintendo Wii U',
        icon: WiiULogo, hex: '#00AEEF', mantine: 'cyan',
        cssVar: 'var(--mantine-color-cyan-filled)',
        family: 'nintendo',
    },
    {
        slug: 'switch', short: 'NS', long: 'Nintendo Switch',
        icon: BsNintendoSwitch, hex: '#DC2626', mantine: 'red',
        cssVar: 'var(--mantine-color-red-filled)',
        family: 'nintendo', featured: true,
    },
    {
        slug: 'switch2', short: 'NS2', long: 'Nintendo Switch 2',
        icon: BsNintendoSwitch, hex: '#EF4444', mantine: 'red',
        cssVar: 'var(--mantine-color-red-filled)',
        family: 'nintendo', featured: true,
    },
    {
        slug: 'win', short: 'Win', long: 'Windows',
        icon: IconBrandWindows, hex: '#6B7280', mantine: 'gray',
        cssVar: 'var(--mantine-color-gray-filled)',
        family: 'pc', featured: true,
    },
    {
        slug: 'mac', short: 'Mac', long: 'macOS',
        icon: IconBrandApple, hex: '#6B7280', mantine: 'gray',
        cssVar: 'var(--mantine-color-gray-filled)',
        family: 'pc', featured: true,
    },
    {
        slug: 'linux', short: 'Linux', long: 'Linux',
        icon: IconBrandUbuntu, hex: '#6B7280', mantine: 'gray',
        cssVar: 'var(--mantine-color-gray-filled)',
        family: 'pc', featured: true,
    },
] as const satisfies readonly PlatformDef[];

export type PlatformSlug = (typeof CATALOG)[number]['slug'];

export const PLATFORMS: readonly PlatformDef[] = CATALOG;

export const PLATFORMS_BY_SLUG: Record<string, PlatformDef> = Object.fromEntries(
    PLATFORMS.map((p) => [p.slug, p]),
);

/** Icono para una consola que el catálogo no conoce todavía. Es el fallback de
 *  TODOS los call-sites: cada uno importaba el suyo, así que una consola sin
 *  entrada podía salir con un icono distinto según la pantalla. */
export const FALLBACK_PLATFORM_ICON = IconDeviceGamepad;

/**
 * Presentación de cada familia. El `label` es lo que se lee en el botón del
 * Navbar y en la tarjeta de la home, así que tiene que nombrar exactamente las
 * consolas marcadas como `featured`: la tarjeta filtra por ellas y no muestra
 * más texto que este.
 */
export const FAMILIES: { family: PlatformFamily; label: string; brand: string }[] = [
    { family: 'playstation', label: 'PS4 / PS5', brand: 'PlayStation' },
    { family: 'xbox', label: 'Xbox 360 / One / Series', brand: 'Xbox' },
    { family: 'nintendo', label: 'Switch / Switch 2', brand: 'Nintendo' },
    { family: 'pc', label: 'PC', brand: 'PC' },
];

export function platformsOf(family: PlatformFamily): readonly PlatformDef[] {
    return PLATFORMS.filter((p) => p.family === family);
}
