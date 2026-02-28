'use client';

import { Badge, type MantineColor } from '@mantine/core';
import type { Platform } from '@/lib/types';

const colorMap: Record<string, MantineColor> = {
    ps5: 'blue',
    ps4: 'indigo',
    xbox: 'green',
    switch: 'red',
    switch2: 'red',
    pc: 'gray',
};

interface Props {
    platform: Platform;
    size?: 'xs' | 'sm' | 'md';
}

export default function PlatformBadge({ platform, size = 'xs' }: Props) {
    return (
        <Badge
            size={size}
            color={colorMap[platform.name] ?? 'gray'}
            variant="filled"
            radius="sm"
            styles={{ root: { textTransform: 'uppercase', fontWeight: 700, fontSize: 10 } }}
        >
            {platform.display_name}
        </Badge>
    );
}
