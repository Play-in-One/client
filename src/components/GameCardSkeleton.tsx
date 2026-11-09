import { Box, Card, Group, Skeleton, Text } from '@mantine/core';
import SkeletonLine from '@/components/skeleton/SkeletonLine';

/**
 * Esqueleto de `GameCard` con su MISMA geometría: el mismo `Card` (borde,
 * radio, sombra), las mismas clases `.pio-game-card`/`.pio-card-*` que cambian
 * de tamaño en 48em, y cada línea dentro del mismo tipo de `Text` que la real
 * (ver `SkeletonLine`). El esqueleto anterior era una portada suelta con tres
 * barras y medía 70-115 px menos que la tarjeta: cada fila empujaba la página
 * al llegar los datos.
 *
 * Reserva dos líneas de título: en una fila basta un nombre largo para que
 * todas las tarjetas (que se estiran a la más alta) midan dos.
 *
 * Sin `'use client'`: lo usan también los `loading.tsx` del servidor, y no
 * lleva ningún compuesto de Mantine.
 */
export default function GameCardSkeleton() {
    return (
        <Card shadow="sm" padding={0} className="pio-game-card" aria-hidden data-skeleton="game-card">
            <Skeleton radius={0} style={{ aspectRatio: '3/4', height: 'auto' }} />
            <Box className="pio-card-info">
                <Group gap="2xs" mb="xs" wrap="nowrap">
                    <Skeleton height={16} width={38} radius="sm" />
                    <Skeleton height={16} width={38} radius="sm" />
                </Group>
                <Text component="div" className="pio-card-title">
                    <SkeletonLine width="90%" /><br /><SkeletonLine width="55%" />
                </Text>
                <Text component="div" fz="xs" mb="sm">
                    <SkeletonLine width="45%" />
                </Text>
                <Box mt="auto" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Text component="div" className="pio-card-price">
                        <SkeletonLine width="55%" />
                    </Text>
                </Box>
            </Box>
        </Card>
    );
}
