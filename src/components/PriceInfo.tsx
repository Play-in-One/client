'use client';

import { useState } from 'react';
import { ActionIcon, Divider, Group, Popover, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { activeCoupon, type Seller } from '@/lib/types';
import { formatCLP } from '@/lib/utils';
import { computeCouponSavings } from './CouponInfo';

interface Props {
    /** Precio de lista de la tienda, sin envío ni cupón. */
    basePrice: string | number | null | undefined;
    /** Envío promedio ya incorporado al precio mostrado. */
    shippingCost: string | number | null | undefined;
    seller?: Pick<Seller, 'has_agreement' | 'coupon_code' | 'coupon_discount_percent'> | null;
    size?: number;
    color?: string;
}

const toNumber = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return null;
    const number = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(number) ? number : null;
};

/**
 * Un único punto de entrada para explicar los ajustes de una oferta. Cuando
 * hay envío y convenio, el mismo popover conserva ambos desgloses sin duplicar
 * el ícono de información junto al precio.
 */
export default function PriceInfo({ basePrice, shippingCost, seller, size = 15, color = 'gray' }: Props) {
    const [opened, setOpened] = useState(false);
    const base = toNumber(basePrice);
    const shipping = toNumber(shippingCost);
    const hasShipping = base !== null && shipping !== null && shipping > 0;
    const coupon = seller ? activeCoupon(seller) : null;
    const couponResult = computeCouponSavings(basePrice, coupon);
    const hasCoupon = couponResult !== null;

    if (!hasShipping && !hasCoupon) return null;

    const ariaLabel = hasShipping && hasCoupon
        ? 'Ver desglose de envío y cupón'
        : hasShipping
            ? 'Ver desglose del precio'
            : 'Ver desglose del cupón';

    return (
        <Popover opened={opened} onChange={setOpened} withArrow shadow="md" width={250} position="top">
            <Popover.Target>
                <ActionIcon
                    component="span"
                    role="button"
                    tabIndex={0}
                    variant="subtle"
                    color={color}
                    size={size + 7}
                    aria-label={ariaLabel}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpened((current) => !current);
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        event.stopPropagation();
                        setOpened((current) => !current);
                    }}
                >
                    <IconInfoCircle size={size} />
                </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown onClick={(event) => event.preventDefault()}>
                <Stack gap={4}>
                    {hasShipping && hasCoupon && coupon && couponResult ? (
                        <>
                            <Text fz="xs" c="dimmed">
                                Precio con el cupón {coupon.code}; el envío se suma después.
                            </Text>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm">Precio en tienda</Text>
                                <Text fz="sm" fw={500}>{formatCLP(base)}</Text>
                            </Group>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm">Con cupón ({coupon.percent}%)</Text>
                                <Text fz="sm" fw={500}>{formatCLP(couponResult.discounted)}</Text>
                            </Group>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm">Envío promedio</Text>
                                <Text fz="sm" fw={500}>+ {formatCLP(shipping)}</Text>
                            </Group>
                            <Divider my={2} />
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm" fw={600}>Total</Text>
                                <Text fz="sm" fw={700}>{formatCLP(couponResult.discounted + shipping)}</Text>
                            </Group>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm" fw={600}>Ahorras</Text>
                                <Text fz="sm" fw={700}>{formatCLP(couponResult.savings)}</Text>
                            </Group>
                            <Text fz="xs" c="dimmed">Aplica el código en el carrito de la tienda al pagar.</Text>
                        </>
                    ) : hasShipping ? (
                        <>
                            <Text fz="xs" c="dimmed">Este precio incluye el envío</Text>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm">Precio en tienda</Text>
                                <Text fz="sm" fw={500}>{formatCLP(base)}</Text>
                            </Group>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm">Envío promedio</Text>
                                <Text fz="sm" fw={500}>+ {formatCLP(shipping)}</Text>
                            </Group>
                            <Divider my={2} />
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm" fw={600}>Total</Text>
                                <Text fz="sm" fw={700}>{formatCLP(base + shipping)}</Text>
                            </Group>
                        </>
                    ) : hasCoupon && coupon && couponResult ? (
                        <>
                            <Text fz="xs" c="dimmed">Precio con el cupón {coupon.code}</Text>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm">Precio en tienda</Text>
                                <Text fz="sm" fw={500}>{formatCLP(couponResult.base)}</Text>
                            </Group>
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm">Con cupón ({coupon.percent}%)</Text>
                                <Text fz="sm" fw={500}>{formatCLP(couponResult.discounted)}</Text>
                            </Group>
                            <Divider my={2} />
                            <Group justify="space-between" gap="xs">
                                <Text fz="sm" fw={600}>Ahorras</Text>
                                <Text fz="sm" fw={700}>{formatCLP(couponResult.savings)}</Text>
                            </Group>
                            <Text fz="xs" c="dimmed">Aplica el código en el carrito de la tienda al pagar.</Text>
                        </>
                    ) : null}
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}
