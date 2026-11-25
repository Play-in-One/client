'use client';

import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Divider, Group, Popover, Stack, Text, VisuallyHidden } from '@mantine/core';
import { IconArrowDown, IconInfoCircle } from '@tabler/icons-react';
import type { ConsoleDealInfo } from '@/lib/consoles';
import { formatCLP } from '@/lib/utils';

/**
 * La rebaja de una consola junto a su precio: «↓N% (i)». Mismo patrón y misma
 * clase que `DealPriceLabel` de los juegos (un `span` con rol de botón que
 * corta el clic, porque la tarjeta entera enlaza a la consola), sin la
 * condición ni la racha, que las ofertas de consolas no calculan. El detalle
 * también va como texto accesible, para que esté en el HTML inicial.
 */
export default function ConsoleDealLabel({ deal }: { deal: ConsoleDealInfo }) {
    const [opened, setOpened] = useState(false);
    const pct = Math.round(deal.discount_pct);
    const line = `Precio típico ${formatCLP(deal.typical_price)}, ahorras ${formatCLP(deal.savings)}`;

    const toggle = (event: MouseEvent | KeyboardEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setOpened((current) => !current);
    };

    return (
        <Popover opened={opened} onChange={setOpened} withArrow shadow="md" width={250} position="top">
            <Popover.Target>
                <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Rebaja de ${pct}% frente a su precio típico: ver detalle`}
                    aria-expanded={opened}
                    data-console-deal-label
                    className="pio-deal-label"
                    onClick={toggle}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') toggle(event);
                    }}
                >
                    <IconArrowDown className="pio-deal-arrow" size={13} stroke={3} aria-hidden />
                    {pct}%
                    <IconInfoCircle size={14} aria-hidden />
                    <VisuallyHidden component="span">{' · '}{line}</VisuallyHidden>
                    {deal.is_all_time_low && <VisuallyHidden component="span"> · Mínimo registrado</VisuallyHidden>}
                </span>
            </Popover.Target>
            <Popover.Dropdown onClick={(event) => event.preventDefault()}>
                <Stack gap="2xs">
                    <Text fz="xs" c="dimmed">
                        Rebaja frente a la mediana de su precio más bajo en los últimos 90 días, con envío incluido.
                    </Text>
                    <Group justify="space-between" gap="xs">
                        <Text fz="sm">Precio típico</Text>
                        <Text fz="sm" fw={500}>{formatCLP(deal.typical_price)}</Text>
                    </Group>
                    <Group justify="space-between" gap="xs">
                        <Text fz="sm">Hoy</Text>
                        <Text fz="sm" fw={500}>{formatCLP(deal.current_price)}</Text>
                    </Group>
                    <Divider my={2} />
                    <Group justify="space-between" gap="xs">
                        <Text fz="sm" fw={600}>Ahorras</Text>
                        <Text fz="sm" fw={700} c="var(--mantine-color-green-text)">{formatCLP(deal.savings)}</Text>
                    </Group>
                    {deal.is_all_time_low && <Text fz="xs" fw={600}>Mínimo registrado</Text>}
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}
