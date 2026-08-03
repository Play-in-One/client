import type { ComponentType } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import { platforms } from '@/lib/colors';

export const PLATFORM_GROUPS: {
    label: string;
    brand: string;
    icon: ComponentType<{ size?: number; color?: string }>;
    color: string;
    options: { label: string; slug: string }[];
}[] = [
    {
        label: 'PlayStation 3 / 4 / 5 / Vita',
        brand: 'PlayStation',
        icon: FaPlaystation,
        color: platforms.ps5,
        options: [
            { label: 'PS3', slug: 'ps3' },
            { label: 'PS4', slug: 'ps4' },
            { label: 'PS5', slug: 'ps5' },
            { label: 'PS Vita', slug: 'psvita' },
        ],
    },
    {
        label: 'Xbox / 360 / One / Series',
        brand: 'Xbox',
        icon: FaXbox,
        color: platforms.xbox,
        options: [
            { label: 'Xbox', slug: 'xbox' },
            { label: 'Xbox 360', slug: 'xbox360' },
            { label: 'Xbox One', slug: 'xboxone' },
            { label: 'Xbox Series', slug: 'xboxseries' },
        ],
    },
    {
        label: 'Nintendo Switch / Wii / DS / 3DS',
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
    },
];
