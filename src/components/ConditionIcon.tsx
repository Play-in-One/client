'use client';

import { Tooltip } from '@mantine/core';
import { IconCloudDownload, IconKey, IconRecycle, IconSparkles } from '@tabler/icons-react';
import { conditionLabelFor } from '@/lib/conditions';

interface Props {
    condition?: string | null;
    size?: number;
}

const ICONS = {
    new: IconSparkles,
    used: IconRecycle,
    store: IconCloudDownload,
    key: IconKey,
} as const;

/** Si la condición tiene icono. `digital` y `download` no lo tienen: quien
 *  envuelve el icono en un recuadro (`CoverChip`) tiene que preguntarlo antes,
 *  o pinta el recuadro vacío, que sobre una portada se ve como un punto. */
export function hasConditionIcon(condition?: string | null): boolean {
    return !!condition && condition in ICONS;
}

/** Indicador accesible del tipo exacto de una oferta. */
export default function ConditionIcon({ condition, size = 13 }: Props) {
    const Icon = condition ? ICONS[condition as keyof typeof ICONS] : undefined;
    if (!Icon) return null;
    const label = conditionLabelFor(condition);
    return (
        <Tooltip label={label} events={{ hover: true, focus: true, touch: true }}>
            <span role="img" aria-label={label} style={{ display: 'flex', lineHeight: 0 }}>
                <Icon size={size} stroke={2.25} />
            </span>
        </Tooltip>
    );
}
