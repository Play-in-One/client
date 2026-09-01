import type { ComponentType } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import { platforms } from '@/lib/colors';

export const PLATFORM_GROUPS: {
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
}[] = [
    {
        label: 'PS4 / PS5',
        brand: 'PlayStation',
        icon: FaPlaystation,
        color: platforms.ps5,
        options: [
            { label: 'PlayStation 3', slug: 'ps3' },
            { label: 'PlayStation 4', slug: 'ps4' },
            { label: 'PlayStation 5', slug: 'ps5' },
            { label: 'PlayStation Vita', slug: 'psvita' },
        ],
        featuredSlugs: ['ps4', 'ps5'],
    },
    {
        label: 'Xbox 360 / One / Series',
        brand: 'Xbox',
        icon: FaXbox,
        color: platforms.xbox,
        options: [
            { label: 'Xbox 360', slug: 'xbox360' },
            { label: 'Xbox One', slug: 'xboxone' },
            { label: 'Xbox Series', slug: 'xboxseries' },
        ],
        featuredSlugs: ['xbox360', 'xboxone', 'xboxseries'],
    },
    {
        label: 'Switch / Switch 2',
        brand: 'Nintendo',
        icon: BsNintendoSwitch,
        color: platforms.switch,
        options: [
            { label: 'Nintendo DS', slug: 'nds' },
            { label: 'Wii', slug: 'wii' },
            { label: 'Nintendo 3DS', slug: '3ds' },
            { label: 'Wii U', slug: 'wiiu' },
            { label: 'Switch', slug: 'switch' },
            { label: 'Switch 2', slug: 'switch2' },
        ],
        featuredSlugs: ['switch', 'switch2'],
    },
];
