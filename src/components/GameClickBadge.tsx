'use client';

import { Badge, Table, Tooltip } from '@mantine/core';
import { IconClick } from '@tabler/icons-react';
import type { GameClickStats } from '@/lib/types';

interface Props {
    stats: GameClickStats | null;
}

const ROWS: { key: keyof Omit<GameClickStats, 'game_id' | 'products'>; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'last_7d', label: '7 días' },
    { key: 'last_30d', label: '30 días' },
];

/**
 * Solo staff: cuántos clics tuvo ESTE juego, separando el interés en la ficha
 * (game_click) de la intención de compra (offer_click). `stats` llega ya
 * resuelto desde el fetch único de `GameDetailClient` —así lo comparte con
 * `ProductClickBadge` sin pedirlo dos veces— y `null` (fetch pendiente o
 * fallido) no pinta nada: es un extra del panel, no debe romper la ficha.
 */
export default function GameClickBadge({ stats }: Props) {
    if (!stats) return null;

    return (
        <Tooltip
            withArrow
            multiline
            w={260}
            position="bottom"
            color="dark.9"
            events={{ hover: true, focus: true, touch: true }}
            label={
                <Table fz="xs" c="white" withRowBorders={false} horizontalSpacing={6} verticalSpacing={2}>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th c="white" />
                            <Table.Th c="white">Juego</Table.Th>
                            <Table.Th c="white">Tienda</Table.Th>
                            <Table.Th c="white">Conv.</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {ROWS.map(({ key, label }) => (
                            <Table.Tr key={key}>
                                <Table.Td c="white">{label}</Table.Td>
                                <Table.Td c="white">{stats[key].game_clicks}</Table.Td>
                                <Table.Td c="white">{stats[key].offer_clicks}</Table.Td>
                                <Table.Td c="white">{stats[key].conversion_rate}%</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            }
        >
            <Badge
                variant="light"
                color="grape"
                size="sm"
                radius="sm"
                leftSection={<IconClick size={12} />}
                styles={{ label: { overflow: 'visible' } }}
                style={{ cursor: 'default' }}
            >
                {stats.today.game_clicks} / {stats.today.offer_clicks}
            </Badge>
        </Tooltip>
    );
}
