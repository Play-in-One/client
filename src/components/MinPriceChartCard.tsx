'use client';

import { Badge, Box, Card, Group, Text, Title } from '@mantine/core';
import { IconChartLine } from '@tabler/icons-react';
import type { MinPricePoint } from '@/lib/types';
import ProductPriceChart from '@/components/ProductPriceChart';

interface MinPriceChartCardProps {
    /** Serie del mínimo de la consola/condición activas, más reciente primero. */
    series: MinPricePoint[];
    platformLabel: string;
    conditionLabel?: string | null;
}

/** Evolución del precio más barato del juego en una consola.
 *
 * A diferencia del gráfico por producto, esta serie sobrevive a que el
 * vendedor más barato cambie o desaparezca: el backend la registra por
 * (juego, consola, condición) cada vez que el mínimo se mueve. */
export default function MinPriceChartCard({
    series,
    platformLabel,
    conditionLabel,
}: MinPriceChartCardProps) {
    const hasEnoughData = series.filter((p) => p.price !== null).length >= 2;

    return (
        <Card withBorder radius="xl" p={0} style={{ overflow: 'hidden' }}>
            <Box p="lg" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <Group justify="space-between" wrap="wrap" gap="md">
                    <Title order={3} fz="lg" fw={700}>
                        <Group gap={8}>
                            <IconChartLine size={20} color="var(--mantine-color-primaryRed-5)" />
                            Historial de Precio Mínimo
                        </Group>
                    </Title>
                    <Group gap="xs">
                        <Badge variant="light" size="sm">{platformLabel}</Badge>
                        {conditionLabel && (
                            <Badge variant="outline" size="sm" color="gray">{conditionLabel}</Badge>
                        )}
                    </Group>
                </Group>
            </Box>

            <Box p="lg">
                {hasEnoughData ? (
                    <ProductPriceChart prices={series} size="lg" />
                ) : (
                    <Text fz="sm" c="dimmed" ta="center" py="xl">
                        Aún no hay suficiente historial para esta consola. Se registra un punto
                        cada vez que cambia el precio más barato.
                    </Text>
                )}
            </Box>
        </Card>
    );
}
