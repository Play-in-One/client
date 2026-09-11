'use client';

import { Badge, Table, Tooltip } from '@mantine/core';
import { IconClick } from '@tabler/icons-react';
import type { ProductClickCounts } from '@/lib/types';

interface Props {
    counts: ProductClickCounts | undefined;
}

const ROWS: { key: keyof ProductClickCounts; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'last_7d', label: '7 días' },
    { key: 'last_30d', label: '30 días' },
];

/**
 * Solo staff: clics a ESTA oferta puntual (offer_click), hoy/7d/30d. El
 * backend trae SIEMPRE una entrada por producto, aunque esté en cero —el
 * badge se muestra igual en cero, para que ausencia de clics no se confunda
 * con "todavía no cargó". `counts` solo falta mientras el fetch está pendiente
 * o si falló (ver `GameDetailClient`), y ahí no se pinta nada.
 */
export default function ProductClickBadge({ counts }: Props) {
    if (!counts) return null;

    return (
        <Tooltip
            withArrow
            multiline
            w={180}
            position="bottom"
            color="dark.9"
            events={{ hover: true, focus: true, touch: true }}
            label={
                <Table fz="xs" c="white" withRowBorders={false} horizontalSpacing={6} verticalSpacing={2}>
                    <Table.Tbody>
                        {ROWS.map(({ key, label }) => (
                            <Table.Tr key={key}>
                                <Table.Td c="white">{label}</Table.Td>
                                <Table.Td c="white">{counts[key]}</Table.Td>
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
                leftSection={<IconClick size={11} />}
                styles={{ label: { overflow: 'visible' } }}
                style={{ cursor: 'default' }}
            >
                {counts.today}
            </Badge>
        </Tooltip>
    );
}
