'use client';

import type { ComponentType } from 'react';
import {
    IconDropletFilled, IconFeather, IconFlowerFilled, IconMountain, IconMushroom, IconPaw, IconSword,
} from '@tabler/icons-react';
import { consoleEditionMarks } from '@/lib/colors';
import { editionSwatch } from '@/lib/consoles';
import styles from './ConsoleCatalog.module.css';

/* Pictogram of each special edition, keyed like `consoleEditionMarks`. Console
   editions are few: one is added here when it appears, and one without an
   entry simply shows no mark. */
const EDITION_ICONS: Record<string, ComponentType<{ size?: number; stroke?: number; color?: string }>> = {
    'mario-red-blue-edition': IconMushroom,
    'the-legend-of-zelda-40th-anniversary': IconSword,
    'the-legend-of-zelda-tears-of-the-kingdom': IconFeather,
    'splatoon-3': IconDropletFilled,
    'fortnite-flowering-chaos': IconFlowerFilled,
    'ghost-of-yotei-limited-edition': IconMountain,
    'marvels-wolverine-battle-yellow': IconPaw,
};

/** Whether an edition has a mark: the swatch of a colour, or a special edition's icon. */
export function hasEditionMark(key?: string | null): boolean {
    return !!key && (!!editionSwatch(key) || (!!consoleEditionMarks[key] && !!EDITION_ICONS[key]));
}

/** The mark of an edition next to its name: a colour dot for a colour edition
 *  («Neón», «Coral»), a small icon for a special one, nothing for the rest. */
export function EditionMark({ editionKey, size = 12 }: { editionKey?: string | null; size?: number }) {
    if (!editionKey) return null;
    const swatch = editionSwatch(editionKey);
    if (swatch) {
        return <span className={styles.swatch} style={{ background: swatch, width: size, height: size }} aria-hidden
            data-edition-swatch={editionKey} />;
    }
    const mark = consoleEditionMarks[editionKey];
    const Icon = EDITION_ICONS[editionKey];
    if (!mark || !Icon) return null;
    // A touch larger than the dot: the pictogram needs the room.
    const box = size + 3;
    return (
        <span className={styles.editionIcon} style={{ background: mark.background, width: box, height: box }} aria-hidden
            data-edition-icon={editionKey}>
            <Icon size={Math.round(box * 0.64)} stroke={2.2} color={mark.foreground} />
        </span>
    );
}
