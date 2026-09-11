'use client';

import { useState } from 'react';
import { Popover, Stack, Group, Text, Divider, ActionIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { formatCLP } from '@/lib/utils';
import { activeCoupon, type Seller } from '@/lib/types';

type Coupon = { code: string; percent: number };

interface Props {
    /** Precio de lista de la tienda, sin envío. El cupón se aplica sobre este
     *  monto: se usa en el carrito de la tienda externa, que no conoce el
     *  envío que estima PIO. */
    basePrice: string | number | null | undefined;
    seller: Pick<Seller, 'has_agreement' | 'coupon_code' | 'coupon_discount_percent'>;
    size?: number;
    /** Color del ícono. `gray` se pierde sobre el hero oscuro del detalle. */
    color?: string;
}

const toNumber = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(num) ? num : null;
};

export function computeCouponSavings(basePrice: string | number | null | undefined, coupon: Coupon | null) {
    const base = toNumber(basePrice);
    if (base === null || !coupon) return null;
    const discounted = base * (1 - coupon.percent / 100);
    return { base, discounted, savings: base - discounted };
}

/**
 * Ícono de información que explica el ahorro de un cupón de convenio.
 *
 * Mismo patrón que `ShippingInfo`: no renderiza nada cuando no hay cupón
 * activo, y usa un Popover (no un Tooltip) porque en móvil un Tooltip que solo
 * abre con hover sería inalcanzable para la mitad del tráfico.
 */
export default function CouponInfo({ basePrice, seller, size = 15, color = 'grape' }: Props) {
    const [opened, setOpened] = useState(false);
    const coupon = activeCoupon(seller);
    const result = computeCouponSavings(basePrice, coupon);

    if (!coupon || !result) return null;
    const { base, discounted, savings } = result;

    return (
        <Popover opened={opened} onChange={setOpened} withArrow shadow="md" width={250} position="top">
            <Popover.Target>
                {/* `component="span"` y no el <button> por defecto: este ícono vive
                    DENTRO del <a> de la fila/hero, y un botón anidado en un enlace
                    es HTML inválido — mismo motivo que en ShippingInfo. El precio ya
                    descontado se muestra aparte (lo manda el backend en
                    current_price/min_price); este ícono solo abre el desglose de
                    cómo se llegó a él. */}
                <ActionIcon
                    component="span"
                    role="button"
                    tabIndex={0}
                    variant="subtle"
                    color={color}
                    size={size + 7}
                    aria-label="Ver desglose del cupón"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpened((o) => !o);
                    }}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        e.stopPropagation();
                        setOpened((o) => !o);
                    }}
                >
                    <IconInfoCircle size={size} />
                </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown onClick={(e) => e.preventDefault()}>
                <Stack gap={4}>
                    <Text fz="xs" c="dimmed">Precio con el cupón {coupon.code}</Text>
                    <Group justify="space-between" gap="xs">
                        <Text fz="sm">Precio en tienda</Text>
                        <Text fz="sm" fw={500}>{formatCLP(base)}</Text>
                    </Group>
                    <Group justify="space-between" gap="xs">
                        <Text fz="sm">Con cupón ({coupon.percent}%)</Text>
                        <Text fz="sm" fw={500}>{formatCLP(discounted)}</Text>
                    </Group>
                    <Divider my={2} />
                    <Group justify="space-between" gap="xs">
                        <Text fz="sm" fw={600}>Ahorras</Text>
                        <Text fz="sm" fw={700}>{formatCLP(savings)}</Text>
                    </Group>
                    <Text fz="xs" c="dimmed">Aplica el código en el carrito de la tienda al pagar.</Text>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}
