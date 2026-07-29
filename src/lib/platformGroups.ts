import type { ComponentType } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';

export const PLATFORM_GROUPS: {
    label: string;
    brand: string;
    icon: ComponentType<{ size?: number; color?: string }>;
    color: string;
    options: { label: string; slug: string }[];
}[] = [
    {
        label: 'PlayStation 4 / 5',
        brand: 'PlayStation',
        icon: FaPlaystation,
        color: '#2563EB',
        options: [
            { label: 'PS4', slug: 'ps4' },
            { label: 'PS5', slug: 'ps5' },
        ],
    },
    {
        label: 'Xbox 360 / One / Series',
        brand: 'Xbox',
        icon: FaXbox,
        color: '#16A34A',
        options: [
            { label: 'Xbox 360', slug: 'xbox360' },
            { label: 'Xbox One', slug: 'xboxone' },
            { label: 'Xbox Series', slug: 'xboxseries' },
        ],
    },
    {
        label: 'Switch / Switch 2',
        brand: 'Switch',
        icon: BsNintendoSwitch,
        color: '#DC2626',
        options: [
            { label: 'Switch', slug: 'switch' },
            { label: 'Switch 2', slug: 'switch2' },
        ],
    },
];
