'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Group, Skeleton, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { platformGameCount } from '@/lib/platformGames';
import { FALLBACK_PLATFORM_ICON, PLATFORM_ICONS } from '@/lib/platformIcons';
import { platformLongName, type Platform } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/utils';
import styles from './ConsoleCatalog.module.css';

const NUMBER = new Intl.NumberFormat('es-CL');

/** Counter of the games PIO lists for the console, linking to its gallery.
 *  `initialCount` comes from the server (public mode); without it (staff
 *  preview) the browser asks, with the landing's own request. */
export function PlatformGamesLink({ platform, initialCount }: { platform: Platform; initialCount?: number | null }) {
    const [count, setCount] = useState<number | null | undefined>(initialCount);
    useEffect(() => {
        if (initialCount !== undefined) return;
        const controller = new AbortController();
        platformGameCount(platform.id, { signal: controller.signal })
            .then(value => { if (!controller.signal.aborted) setCount(value); })
            .catch(() => { if (!controller.signal.aborted) setCount(null); });
        return () => controller.abort();
    }, [platform.id, initialCount]);

    // No games: a link to an empty gallery helps nobody.
    if (count === 0) return null;
    const Icon = PLATFORM_ICONS[platform.slug] || FALLBACK_PLATFORM_ICON;
    const name = platformLongName(platform);
    return (
        <Card component={Link} href={`/juegos/${platform.slug}`} className={`pio-lift ${styles.gamesLink}`} p="sm" radius="md"
            data-console-games aria-busy={count === undefined}>
            <Group gap="sm" wrap="nowrap">
                <div className={styles.gamesIcon} style={{ color: PLATFORM_COLORS[platform.slug]?.cssVar }}><Icon size={22} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {count === undefined
                        ? <Skeleton h={18} w={160} />
                        : <Text fw={800} lh={1.2}>
                            {count === null ? `Juegos de ${name}` : `${NUMBER.format(count)} ${count === 1 ? 'juego compatible' : 'juegos compatibles'}`}
                        </Text>}
                    <Text fz="xs" c="dimmed">Ver la galería de {name} en PIO</Text>
                </div>
                <IconChevronRight size={18} color="var(--mantine-color-dimmed)" aria-hidden />
            </Group>
        </Card>
    );
}
