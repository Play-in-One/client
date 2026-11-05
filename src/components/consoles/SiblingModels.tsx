'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Text } from '@mantine/core';
import { getConsoles } from '@/lib/api';
import { consolePath, type ConsoleModel } from '@/lib/consoles';
import { platformLongName, type Platform } from '@/lib/types';
import { PLATFORM_COLORS, formatCLP } from '@/lib/utils';
import styles from './ConsoleCatalog.module.css';

/** "PlayStation 5 Slim Digital" reads "Slim Digital" next to the other
 *  PlayStation 5 models; the bare platform name is the original model. */
export function modelLabel(name: string, platform: Platform): string {
    const prefix = platformLongName(platform);
    if (!name.toLowerCase().startsWith(prefix.toLowerCase())) return name;
    return name.slice(prefix.length).trim() || 'Original';
}

/** Switcher between the models of the same console platform. The list comes
 *  from the server in public mode; the staff preview loads it with the token,
 *  since the models are drafts. Hidden when the model is the only one. */
export function SiblingModels({ current, initialModels, preview }: {
    current: ConsoleModel;
    initialModels?: ConsoleModel[] | null;
    preview: boolean;
}) {
    const [models, setModels] = useState<ConsoleModel[] | null | undefined>(initialModels);
    const platform = current.platform;
    useEffect(() => {
        if (initialModels !== undefined) return;
        const controller = new AbortController();
        getConsoles({ platform: platform.slug }, { signal: controller.signal, admin: preview })
            .then(page => { if (!controller.signal.aborted) setModels(page.results); })
            .catch(() => { if (!controller.signal.aborted) setModels(null); });
        return () => controller.abort();
    }, [platform.slug, preview, initialModels]);

    const list = (models ?? []).filter(model => model.platform.slug === platform.slug);
    if (!list.some(model => model.id !== current.id)) return null;
    // The current model is always in the row, even if a filter hid it from the list.
    const row = list.some(model => model.id === current.id) ? list : [current, ...list];
    const color = PLATFORM_COLORS[platform.slug]?.mantine ?? 'gray';
    return (
        <nav aria-label={`Modelos de ${platformLongName(platform)}`} data-console-models>
            <Text fz="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>Modelos de {platformLongName(platform)}</Text>
            <div className={styles.platformRow}>
                {row.map(model => {
                    const active = model.id === current.id;
                    return (
                        <Button key={model.id} component={Link} href={consolePath(model)} size="xs" radius="sm"
                            variant={active ? 'filled' : 'subtle'} color={active ? color : 'gray'}
                            aria-current={active ? 'page' : undefined} title={model.name}
                            rightSection={!active && model.min_price != null
                                ? <Text span fz={11} c="dimmed" className={styles.price}>{formatCLP(model.min_price)}</Text>
                                : undefined}>
                            {modelLabel(model.name, platform)}
                        </Button>
                    );
                })}
            </div>
        </nav>
    );
}
