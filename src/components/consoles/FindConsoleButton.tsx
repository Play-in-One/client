'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useAdmin } from '@/context/AdminContext';
import { CONSOLE_PLATFORMS } from '@/lib/consoles';
import { CONSOLES_PUBLIC, CONSOLES_STAFF_PREVIEW } from '@/lib/features';
import { FALLBACK_PLATFORM_ICON, PLATFORM_ICONS } from '@/lib/platformIcons';
import type { Platform } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/utils';
import styles from './FindConsoleButton.module.css';

const CONSOLE_SLUGS: ReadonlySet<string> = new Set(CONSOLE_PLATFORMS.map(([slug]) => slug));

/** From a console's game gallery to that console's hardware catalog.
 *
 *  It follows the console pages' visibility: once public it is a real link in
 *  the server HTML (`available`: the server saw at least one published model);
 *  during the staff preview only a signed-in admin sees it, so nothing public
 *  links to the console pages. Platforms without hardware here (PC, PS3…)
 *  never show it. */
export function FindConsoleButton({ platform, available = false }: { platform: Platform; available?: boolean }) {
    const { isAdmin, ready } = useAdmin();
    if (!CONSOLE_SLUGS.has(platform.slug)) return null;
    if (CONSOLES_PUBLIC ? !available : !(CONSOLES_STAFF_PREVIEW && ready && isAdmin)) return null;
    const Icon = PLATFORM_ICONS[platform.slug] || FALLBACK_PLATFORM_ICON;
    const colors = PLATFORM_COLORS[platform.slug];
    return (
        <Button component={Link} href={`/consolas?platform=${platform.slug}`} size="md" radius="xl" variant="filled"
            color={colors?.mantine ?? 'gray'} leftSection={<Icon size={22} />} rightSection={<IconChevronRight size={18} stroke={2.5} />}
            classNames={{ root: styles.root, section: styles.section }}
            style={{ '--find-accent': colors?.cssVar ?? 'var(--mantine-color-gray-6)' } as CSSProperties}
            data-find-console>
            Encuentra tu próxima consola
            {!CONSOLES_PUBLIC && <Badge ml={8} size="xs" color="caution" variant="white">staff</Badge>}
        </Button>
    );
}
