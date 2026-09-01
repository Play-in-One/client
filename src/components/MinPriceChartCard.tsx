'use client';

import { useMemo, useState } from 'react';
import { Badge, Box, Card, Group, SegmentedControl, Text, Title } from '@mantine/core';
import { IconChartLine } from '@tabler/icons-react';
import type { MinPricePoint } from '@/lib/types';
import { buildPriceSeries } from '@/lib/priceSeries';
import PriceHistoryChart from '@/components/PriceHistoryChart';

interface MinPriceChartCardProps {
    /** Serie del mínimo de la consola/condición activas, más reciente primero. */
    series: MinPricePoint[];
    platformLabel: string;
    conditionLabel?: string | null;
}

const RANGE_OPTIONS = [
    { value: '30', label: '30d' },
    { value: '90', label: '90d' },
    { value: '180', label: '180d' },
];

// El backend recorta la serie a 180 días, así que arrancar en el rango más
// ancho muestra todo lo que hay y evita que un juego de poco movimiento abra
// con el gráfico vacío.
const DEFAULT_RANGE = '180';

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
    const [range, setRange] = useState(DEFAULT_RANGE);
    // `now` congelado por montaje: recalcularlo en cada render movería el borde
    // derecho del gráfico y el dominio del eje sin que nadie tocara nada.
    const [now] = useState(() => Date.now());

    const rangeDays = Number(range);
    const built = useMemo(
        () => buildPriceSeries(series, rangeDays, now),
        [series, rangeDays, now],
    );

    // Dos guardas distintas: una sobre la serie completa, que decide si esta
    // consola tiene historial en absoluto, y otra sobre la ventana elegida.
    const hasAnyHistory = series.some((p) => p.price !== null);
    const canPlot = built.plotCount >= 2;

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
                        {hasAnyHistory && (
                            <SegmentedControl
                                size="xs"
                                radius="md"
                                value={range}
                                onChange={setRange}
                                data={RANGE_OPTIONS}
                                aria-label="Rango del historial"
                            />
                        )}
                    </Group>
                </Group>
            </Box>

            <Box p="lg">
                {!hasAnyHistory ? (
                    <Text fz="sm" c="dimmed" ta="center" py="xl">
                        Aún no hay suficiente historial para esta consola. Se registra un punto
                        cada vez que cambia el precio más barato.
                    </Text>
                ) : !canPlot ? (
                    // Hay historial, pero no alcanza a esta ventana: decirlo así
                    // en vez de "no hay datos", que sería falso.
                    <Text fz="sm" c="dimmed" ta="center" py="xl">
                        Sin stock ni cambios registrados en los últimos {rangeDays} días.
                        Prueba con un rango más amplio.
                    </Text>
                ) : (
                    <>
                        <PriceHistoryChart points={built.points} domain={built.domain} />
                        {built.realCount === 0 && (
                            // Línea plana de borde a borde: sin esta nota parece
                            // que el gráfico está roto.
                            <Text fz="xs" c="dimmed" ta="center" mt="xs">
                                El precio no ha cambiado en los últimos {rangeDays} días.
                            </Text>
                        )}
                    </>
                )}
            </Box>
        </Card>
    );
}
