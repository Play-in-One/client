'use client';

import type { ReactNode } from 'react';
import { Badge, Box, Card, Group, Title } from '@mantine/core';
import { IconChartLine } from '@tabler/icons-react';
import PriceHistoryLoading from '@/components/PriceHistoryLoading';

/**
 * El marco de la tarjeta del historial de precios: cabecera (título, consola,
 * condición y el selector de rango) y cuerpo. Vive aparte de
 * `MinPriceChartCard` a propósito: esa tarjeta trae recharts y se carga sola
 * cuando el gráfico se acerca a la pantalla, mientras que este marco va en el
 * bundle de la ficha y se pinta desde el primer momento con su animación de carga.
 * Esqueleto, espera y tarjeta final usan el mismo marco, así que nada se mueve
 * cuando llegan los datos.
 */
export function MinPriceChartFrame({ platformLabel, conditionLabel, controls, children }: {
    platformLabel?: string | null;
    conditionLabel?: string | null;
    /** El selector de rango; ocupa su alto aunque todavía no esté. */
    controls?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Card radius="xl" p={0} style={{ overflow: 'hidden' }} data-price-history>
            <Box p="lg" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                {/* `mih` = el alto del selector de rango (xs). */}
                <Group justify="space-between" wrap="wrap" gap="md" mih={32.6}>
                    <Title order={3} fz="lg" fw={700}>
                        <Group gap={8}>
                            <IconChartLine size={20} color="var(--mantine-color-primaryRed-5)" />
                            Historial de Precio Mínimo
                        </Group>
                    </Title>
                    <Group gap="xs">
                        {platformLabel && <Badge variant="light" size="sm">{platformLabel}</Badge>}
                        {conditionLabel && (
                            <Badge variant="outline" size="sm" color="gray">{conditionLabel}</Badge>
                        )}
                        {/* Mientras no llega, su hueco (118 × 33 px, el del
                            selector de rango xs): en un teléfono el selector no
                            cabe junto al título y, al aparecer con el dato,
                            pasaba la cabecera a dos filas (+41 px). */}
                        {controls || <Box w={118} h={32.6} aria-hidden />}
                    </Group>
                </Group>
            </Box>
            <Box p="lg">{children}</Box>
        </Card>
    );
}

/** El cuerpo mientras llegan los datos: búsqueda animada en el alto del
 *  gráfico (220 px). */
export function MinPriceChartSpinner() {
    return <PriceHistoryLoading />;
}

/** La tarjeta entera esperando sus datos. */
export function MinPriceChartLoading({ platformLabel, conditionLabel }: {
    platformLabel?: string | null;
    conditionLabel?: string | null;
}) {
    return (
        <MinPriceChartFrame platformLabel={platformLabel} conditionLabel={conditionLabel}>
            <MinPriceChartSpinner />
        </MinPriceChartFrame>
    );
}
