'use client';

import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Badge, Divider, Group, Popover, Stack, Text, VisuallyHidden } from '@mantine/core';
import { IconArrowDown, IconInfoCircle } from '@tabler/icons-react';
import { CONDITION_LABEL } from '@/lib/conditions';
import { dealAgeLabel, dealBadgeLine } from '@/lib/deals';
import type { Deal } from '@/lib/types';
import { formatCLP } from '@/lib/utils';

/**
 * La rebaja junto al precio de la tarjeta: «↓79% (i)». La (i) abre el detalle
 * (condición, precio típico, ahorro, cuánto lleva en oferta y si es el mínimo
 * registrado), con el mismo patrón que `PriceInfo`: un `span` con rol de botón
 * que corta el click, porque la tarjeta entera es un enlace a la ficha.
 *
 * El detalle del popover se monta en un portal solo al abrirlo, así que no
 * existiría en el HTML inicial. Por eso la misma información va también como
 * texto accesible oculto (`VisuallyHidden`, el patrón estándar para lectores
 * de pantalla): es la línea que antes se veía bajo la tarjeta, de modo que los
 * buscadores y los crawlers de IA siguen leyendo exactamente lo que el
 * visitante ve al abrir la (i). `data-deal-line` la marca para los e2e.
 */
export default function DealPriceLabel({ deal, isToday = true }: { deal: Deal; isToday?: boolean }) {
    const [opened, setOpened] = useState(false);
    const pct = Math.round(deal.discount_pct);
    const age = dealAgeLabel(deal, isToday);
    const condition = CONDITION_LABEL[deal.condition] ?? CONDITION_LABEL.new;

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
                    data-deal-label
                    className="pio-deal-label"
                    onClick={toggle}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') toggle(event);
                    }}
                >
                    <IconArrowDown size={13} stroke={3} aria-hidden />
                    {pct}%
                    <IconInfoCircle size={14} aria-hidden />
                    <VisuallyHidden component="span" data-deal-line>{dealBadgeLine(deal)}</VisuallyHidden>
                    {age && <VisuallyHidden component="span" data-deal-age>{age}</VisuallyHidden>}
                    {deal.is_all_time_low && <VisuallyHidden component="span">Mínimo registrado</VisuallyHidden>}
                </span>
            </Popover.Target>
            <Popover.Dropdown onClick={(event) => event.preventDefault()}>
                <Stack gap={4}>
                    <Text fz="xs" c="dimmed">
                        Rebaja frente a la mediana de sus últimos 90 días en la misma condición.
                    </Text>
                    <Group justify="space-between" gap="xs">
                        <Text fz="sm">Condición</Text>
                        <Text fz="sm" fw={500}>{condition}</Text>
                    </Group>
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
                        <Text fz="sm" fw={700} c="var(--mantine-color-green-text)">
                            {formatCLP(deal.savings)} ({pct}%)
                        </Text>
                    </Group>
                    {(age || deal.is_all_time_low) && (
                        <Group gap={4} mt={4} wrap="wrap">
                            {/* «Registrado» y no «histórico»: la serie empieza cuando
                                PIO empezó a seguir el juego, no en su lanzamiento. */}
                            {deal.is_all_time_low && (
                                <Badge size="sm" color="green" variant="light">Mínimo registrado</Badge>
                            )}
                            {age && (
                                <Badge size="sm" color={deal.is_new ? 'primaryRed' : 'gray'} variant="light">
                                    {age}
                                </Badge>
                            )}
                        </Group>
                    )}
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}
