import type { ComponentType } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import { IconDeviceDesktop } from '@tabler/icons-react';
import { WiiULogo, WiiLogo, NintendoDSLogo } from '@/components/icons/PlatformLogos';

/** Ícono de marca por slug de plataforma. Fuente única — antes vivía duplicado
 * dentro de GameDetailClient.tsx. */
export const PLATFORM_ICONS: Record<string, ComponentType<{ size?: number; className?: string; color?: string }>> = {
    ps5: FaPlaystation,
    ps4: FaPlaystation,
    ps3: FaPlaystation,
    psvita: FaPlaystation,
    xbox: FaXbox,
    xbox360: FaXbox,
    xboxone: FaXbox,
    xboxseries: FaXbox,
    switch: BsNintendoSwitch,
    switch2: BsNintendoSwitch,
    pc: IconDeviceDesktop,
    wii: WiiLogo,
    nds: NintendoDSLogo,
    '3ds': NintendoDSLogo,
    wiiu: WiiULogo,
};

/** Nombre completo de la consola por slug, para selectores anchos (desktop).
 * El `display_name` del backend es ya una abreviatura ("PS5", "Switch"), así
 * que no sirve como versión larga. Las consolas que no aparecen aquí caen en
 * `display_name`. */
export const PLATFORM_LONG_LABELS: Record<string, string> = {
    ps3: 'PlayStation 3',
    ps4: 'PlayStation 4',
    ps5: 'PlayStation 5',
    psvita: 'PlayStation Vita',
    xbox: 'Xbox',
    xbox360: 'Xbox 360',
    xboxone: 'Xbox One',
    xboxseries: 'Xbox Series',
    switch: 'Nintendo Switch',
    switch2: 'Nintendo Switch 2',
    wii: 'Nintendo Wii',
    wiiu: 'Nintendo Wii U',
    nds: 'Nintendo DS',
    '3ds': 'Nintendo 3DS',
    pc: 'PC',
};

/** Nombres cortos por slug de plataforma, para selectores angostos (mobile,
 * el selector del detalle). Fuente única — antes vivía duplicado dentro de
 * GameDetailClient.tsx. Las consolas que no aparecen aquí usan `display_name`. */
export const PLATFORM_SHORT_LABELS: Record<string, string> = {
    switch: 'NS',
    switch2: 'NS2',
    psvita: 'PSV',
    wiiu: 'WiiU',
    nds: 'DS',
    '3ds': '3DS',
    xbox360: 'X360',
    xboxone: 'XOne',
    xboxseries: 'XSeries',
};
