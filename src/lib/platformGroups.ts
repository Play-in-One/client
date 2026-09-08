import type { ComponentType } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import { IconDeviceDesktop } from '@tabler/icons-react';
import { FAMILIES, platformsOf, type PlatformFamily } from '@/lib/platforms';

export interface PlatformGroup {
    label: string;
    brand: string;
    icon: ComponentType<{ size?: number; color?: string }>;
    color: string;
    /* Consolas que el botón/tarjeta muestra en `label` — usadas para el
       filtro de esa tarjeta, que no debe incluir consolas no mencionadas
       en el texto (ver `featuredSlugs` más abajo). */
    options: { label: string; slug: string }[];
    /* Subconjunto de `options` que coincide con lo que dice `label`. El menú
       desplegable de Navbar sí lista cada consola individualmente y usa
       `options` completo; la tarjeta de "Explorar por Plataforma" en la home
       solo muestra el texto de `label`, así que su filtro debe acotarse a
       estos slugs. */
    featuredSlugs: string[];
}

/* Icono y color de cada familia. El color sale de la consola más representativa
   de la marca, que es la que ya se usaba. */
const FAMILY_ICONS: Record<PlatformFamily, ComponentType<{ size?: number; color?: string }>> = {
    playstation: FaPlaystation,
    xbox: FaXbox,
    nintendo: BsNintendoSwitch,
    pc: IconDeviceDesktop,
};

const FAMILY_COLOR_SLUG: Record<PlatformFamily, string> = {
    playstation: 'ps5',
    xbox: 'xbox',
    nintendo: 'switch',
    pc: 'win',
};

/**
 * Los grupos del Navbar, el Footer y la home, derivados del catálogo
 * (`lib/platforms.ts`) agrupando por familia.
 *
 * Se escribían a mano, y por eso **`xbox` y `pc` no estaban en ningún grupo**
 * aunque existían en el backend: eran invisibles en la navegación y el Footer
 * los reinyectaba con dos entradas sueltas. Derivándolo, una consola nueva
 * entra en su familia sin tocar este archivo.
 */
export const PLATFORM_GROUPS: PlatformGroup[] = FAMILIES.map(({ family, label, brand }) => {
    const members = platformsOf(family);
    return {
        label,
        brand,
        icon: FAMILY_ICONS[family],
        color: members.find((p) => p.slug === FAMILY_COLOR_SLUG[family])?.hex ?? members[0].hex,
        options: members.map((p) => ({ label: p.long, slug: p.slug })),
        featuredSlugs: members.filter((p) => p.featured).map((p) => p.slug),
    };
});
