'use client';

import { Badge } from '@mantine/core';
import type { Platform } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABEL_OVERRIDES } from '@/lib/utils';

interface Props {
    platform: Platform;
    size?: 'xs' | 'sm' | 'md';
}

export default function PlatformBadge({ platform, size = 'xs' }: Props) {
    return (
        <Badge
            size={size}
            color={PLATFORM_COLORS[platform.slug]?.mantine ?? 'gray'}
            variant="filled"
            radius="sm"
            styles={{ root: { textTransform: 'uppercase', fontWeight: 700, fontSize: 10 } }}
        >
            {PLATFORM_LABEL_OVERRIDES[platform.slug] ?? platform.display_name}
        </Badge>
    );
}
