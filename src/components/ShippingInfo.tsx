'use client';

import { useState } from 'react';
import { Popover, Stack, Group, Text, Divider, ActionIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { formatCLP } from '@/lib/utils';

interface Props {
    /** Precio de lista de la tienda, sin envío. */
    basePrice: string | number | null | undefined;
    /** Envío promedio ya incluido en el precio mostrado. */
    shippingCost: string | number | null | undefined;
    size?: number;
    /** Color del ícono. `gray` se pierde sobre el hero oscuro del detalle. */
    color?: string;
}

const toNumber = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(num) ? num : null;
};

/**
 * Ícono de información que explica un precio que lleva envío incluido.
 *
 * No renderiza nada cuando no hay despacho que declarar: la mayoría de las
 * ofertas son de tiendas sin envío, y un ícono que casi siempre dice "no se
 * sumó nada" deja de leerse justo donde importa.
 *
 * Va en un Popover y no en un Tooltip a propósito: el Tooltip de Mantine solo
 * abre con hover o foco, así que en móvil —donde se ve la mitad del tráfico—
 * el desglose sería inalcanzable.
 */
export default function ShippingInfo({ basePrice, shippingCost, size = 15, color = 'gray' }: Props) {
    const [opened, setOpened] = useState(false);
    const base = toNumber(basePrice);
    const shipping = toNumber(shippingCost);

    if (base === null || shipping === null || shipping <= 0) return null;

    return (
        <Popover opened={opened} onChange={setOpened} withArrow shadow="md" width={230} position="top">
            <Popover.Target>
                {/* `component="span"` y no el <button> por defecto: este ícono vive
                    DENTRO del <a> de la tarjeta, y un botón anidado en un enlace es
                    HTML inválido — el hit-testing se vuelve inconsistente (iOS
                    Safari sobre todo) y con él el tap en la tarjeta. El rol y el
                    manejo de teclado se reponen a mano para no perder nada. */}
                <ActionIcon
                    component="span"
                    role="button"
                    tabIndex={0}
                    variant="subtle"
                    color={color}
                    size={size + 7}
                    aria-label="Ver desglose del precio"
                    onClick={(e) => {
                        // La tarjeta entera es un Link: sin esto, tocar el ícono
                        // abriría el juego en vez del desglose.
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
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}
