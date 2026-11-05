'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { Anchor, Badge, Button, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import AffiliateMark from '@/components/AffiliateMark';
import PriceInfo from '@/components/PriceInfo';
import SellerLogo from '@/components/SellerLogo';
import SellerScopeBadge from '@/components/SellerScopeBadge';
import { conditionBadgeColorFor, conditionLabelFor } from '@/lib/conditions';
import { packGamesLabel, type ConsoleConfiguration } from '@/lib/consoles';
import { isAffiliateOffer, type Product } from '@/lib/types';
import { formatCLP } from '@/lib/utils';
import styles from './ConsoleCatalog.module.css';

export function hasLivePrice(product: Product) {
    return product.in_stock && product.current_price != null && Number(product.current_price) > 0;
}

export function ConsoleOfferRow({ product, configuration, index, best, showPack, href, onOffer }: {
    product: Product;
    configuration?: ConsoleConfiguration;
    index: number;
    best: boolean;
    /** With every pack listed, each row says which one it sells. */
    showPack: boolean;
    href: string;
    onOffer: (event: MouseEvent, product: Product) => void;
}) {
    const live = hasLivePrice(product);
    const priced = product.current_price != null && Number(product.current_price) > 0;
    return (
        <article className={`game-offer-row ${styles.offer}`} data-console-offer data-stock={String(product.in_stock)}
            data-out-of-stock={product.in_stock ? undefined : true}>
            <Group gap="sm" wrap="nowrap" align="flex-start" className={styles.offerMain}>
                <Anchor component={Link} href={`/store/${product.seller.id}`} underline="never" c="inherit" aria-hidden tabIndex={-1}>
                    <SellerLogo seller={product.seller} index={index} />
                </Anchor>
                <Stack gap={4} style={{ minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                        <Anchor component={Link} href={`/store/${product.seller.id}`} fw={700} c="inherit">{product.seller.name}</Anchor>
                        <SellerScopeBadge seller={product.seller} />
                        {isAffiliateOffer(product) && <AffiliateMark label="Oferta afiliada" size={18} />}
                    </Group>
                    {showPack && <Text fz="sm" fw={500}>{configuration
                        ? `${configuration.edition_name} · ${configuration.storage_label} · ${packGamesLabel(configuration)}`
                        : product.title}</Text>}
                    <Group gap={6}>
                        <Badge size="sm" variant="light" color={conditionBadgeColorFor(product.condition)}>{conditionLabelFor(product.condition)}</Badge>
                        {!product.in_stock && <Badge size="sm" variant="light" color="gray">Sin stock</Badge>}
                        <Text fz="xs" c="dimmed" lineClamp={1} title={product.title} style={{ flex: '1 1 160px', minWidth: 0 }}>«{product.title}»</Text>
                    </Group>
                </Stack>
            </Group>
            <div className={styles.offerAside}>
                <Group gap="2xs" wrap="nowrap">
                    <Text fw={800} fz="xl" className={styles.price} c={best ? 'var(--pio-brand-text)' : undefined}>
                        {priced ? formatCLP(product.current_price!) : 'Sin precio'}
                    </Text>
                    {priced && <PriceInfo basePrice={product.base_price} shippingCost={product.shipping_cost} seller={product.seller} />}
                </Group>
                {live ? (
                    <Button component="a" href={href} target="_blank" rel="noopener noreferrer sponsored" size="sm"
                        color="primaryRed" variant={best ? 'filled' : 'light'} rightSection={<IconExternalLink size={15} />}
                        onClick={(event: MouseEvent) => onOffer(event, product)}>
                        Ver en tienda
                    </Button>
                ) : (
                    <Text fz="sm" c="dimmed">{product.in_stock ? 'Precio no informado' : 'Oferta agotada'}</Text>
                )}
            </div>
        </article>
    );
}

export function ConsoleOfferRowSkeleton() {
    return (
        <div className={styles.offer} aria-hidden data-console-offer-skeleton>
            <Group gap="sm" wrap="nowrap" align="flex-start" className={styles.offerMain}>
                <Skeleton w={40} h={40} radius="sm" style={{ flexShrink: 0 }} />
                <Stack gap={8} style={{ flex: 1 }}>
                    <Skeleton h={14} w="35%" />
                    <Skeleton h={12} w="60%" />
                    <Skeleton h={12} w="45%" />
                </Stack>
            </Group>
            <div className={styles.offerAside}>
                <Skeleton h={22} w={110} />
                <Skeleton h={30} w={130} radius="sm" />
            </div>
        </div>
    );
}
