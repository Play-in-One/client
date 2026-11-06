'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@mantine/core';
import { IconChevronRight, IconDeviceGamepad2 } from '@tabler/icons-react';
import { useAdmin } from '@/context/AdminContext';
import { isConsolePlatform } from '@/lib/consoles';
import { CONSOLES_PUBLIC, CONSOLES_STAFF_PREVIEW } from '@/lib/features';
import { FALLBACK_PLATFORM_ICON, PLATFORM_ICONS } from '@/lib/platformIcons';
import type { Platform } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/utils';
import styles from './FindConsoleButton.module.css';

/** «Encuentra tu próxima consola»: from a game gallery or the home hero to the
 *  hardware catalog. With a console `platform` it goes to that console's
 *  catalog in its colour; without one, to every console in the brand colour.
 *  A platform with no hardware here (PC, PS3…) shows nothing.
 *
 *  It follows the console pages' visibility: once public it is a real link in
 *  the server HTML (`available`: the server saw a published model); during the
 *  staff preview only a signed-in admin sees it, so nothing public links to
 *  the console pages. */
export function FindConsoleButton({ platform, available = false, align }: {
    platform?: Pick<Platform, 'slug'> | null;
    available?: boolean;
    /** The home hero centres it; galleries keep it at the end of their title row. */
    align?: 'center';
}) {
    const { isAdmin, ready } = useAdmin();
    if (platform && !isConsolePlatform(platform.slug)) return null;
    if (CONSOLES_PUBLIC ? !available : !(CONSOLES_STAFF_PREVIEW && ready && isAdmin)) return null;
    const Icon = platform ? PLATFORM_ICONS[platform.slug] || FALLBACK_PLATFORM_ICON : IconDeviceGamepad2;
    const colors = platform ? PLATFORM_COLORS[platform.slug] : undefined;
    const accent = platform ? colors?.cssVar ?? 'var(--mantine-color-gray-6)' : 'var(--mantine-color-primaryRed-6)';
    return (
        <Button component={Link} href={platform ? `/consolas?platform=${platform.slug}` : '/consolas'} size="md" radius="xl"
            variant="filled" color={platform ? colors?.mantine ?? 'gray' : 'primaryRed'}
            leftSection={<Icon size={22} />} rightSection={<IconChevronRight size={18} stroke={2.5} />}
            classNames={{ root: styles.root, section: styles.section }} data-align={align}
            style={{ '--find-accent': accent } as CSSProperties}
            data-find-console={platform?.slug ?? 'all'}>
            Encuentra tu próxima consola
            {!CONSOLES_PUBLIC && <Badge ml={8} size="xs" color="caution" variant="white">staff</Badge>}
        </Button>
    );
}
