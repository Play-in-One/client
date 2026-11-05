'use client';

import Link from 'next/link';
import { Badge, Card, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import PlatformBadge from '@/components/PlatformBadge';
import RemoteImage from '@/components/RemoteImage';
import { consolePath, type ConsoleModel } from '@/lib/consoles';
import { FALLBACK_PLATFORM_ICON, PLATFORM_ICONS } from '@/lib/platformIcons';
import { formatCLP } from '@/lib/utils';
import styles from './ConsoleCatalog.module.css';

/** The model photo, or its platform's mark when no offer has one (the game
 *  placeholder is a box-art silhouette, wrong for hardware). */
export function ConsoleImage({ image, name, platform, sizes, priority }: {
    image?: string | null; name: string; platform: string; sizes: string; priority?: boolean;
}) {
    if (!image) {
        const Icon = PLATFORM_ICONS[platform] || FALLBACK_PLATFORM_ICON;
        return <div className={styles.noImage} role="img" aria-label={`${name}: sin imagen`}><Icon size={56} /></div>;
    }
    return <RemoteImage src={image} alt={name} sizes={sizes} priority={priority}
        style={{ objectFit: 'contain', padding: 'var(--mantine-spacing-lg)' }} />;
}

export function plural(count: number, one: string, many: string) {
    return `${count} ${count === 1 ? one : many}`;
}

export function ConsoleCard({ model, showDraft = false, headingOrder = 3 }: {
    model: ConsoleModel; showDraft?: boolean; headingOrder?: 2 | 3;
}) {
    const priced = model.min_price != null;
    return (
        <Card component={Link} href={consolePath(model)} className={`pio-lift ${styles.card}`} p={0} data-console-card>
            <div className={styles.media}>
                <ConsoleImage image={model.image} name={model.name} platform={model.platform.slug}
                    sizes="(max-width: 36em) 100vw, (max-width: 62em) 50vw, 320px" />
                <Group gap="2xs" className={styles.mediaBadges}>
                    <PlatformBadge platform={model.platform} />
                    {showDraft && model.is_published === false && <Badge size="xs" color="caution" variant="filled">Borrador</Badge>}
                </Group>
            </div>
            <Stack gap={6} p="md" style={{ flex: 1 }}>
                <Title order={headingOrder} fz="md" fw={700} lh={1.3}>{model.name}</Title>
                <div style={{ marginTop: 'auto' }}>
                    {priced ? (
                        <Text lh={1.2}>
                            <Text span fz="xs" c="dimmed">Desde </Text>
                            <Text span fz="xl" fw={800} className={styles.price}>{formatCLP(model.min_price!)}</Text>
                        </Text>
                    ) : (
                        <Badge color="gray" variant="light">Sin stock</Badge>
                    )}
                    <Text fz="sm" c="dimmed" mt={4}>
                        {model.seller_count > 0 ? plural(model.seller_count, 'tienda', 'tiendas') : 'Sin ofertas con precio vigente'}
                    </Text>
                </div>
            </Stack>
        </Card>
    );
}

export function ConsoleCardSkeleton() {
    return (
        <Card p={0} aria-hidden>
            <Skeleton style={{ aspectRatio: '4 / 3' }} radius={0} />
            <Stack gap="xs" p="md">
                <Skeleton h={16} w="70%" />
                <Skeleton h={22} w="45%" mt="sm" />
                <Skeleton h={12} w="55%" />
            </Stack>
        </Card>
    );
}
