'use client';

import { Box, Group, Table, Text, Tooltip } from '@mantine/core';

import type { RetentionCohortRow } from '@/lib/types';

/* Matriz de cohortes: cada fila es la gente que llegó una semana, cada columna
 * cuántos de ellos seguían apareciendo N semanas después.
 *
 * Solo cuenta visitantes que aceptaron la cookie: sin ella no hay forma de
 * saber que alguien volvió. La cifra de la esquina superior izquierda es
 * siempre el 100% por definición. */

/** Verde con opacidad proporcional al porcentaje. 0% queda transparente. */
function cellStyle(rate: number): React.CSSProperties {
    if (rate <= 0) return {};
    const alpha = 0.12 + (Math.min(rate, 100) / 100) * 0.55;
    return {
        background: `color-mix(in srgb, var(--mantine-color-teal-6) ${alpha * 100}%, transparent)`,
    };
}

function weekLabel(iso: string): string {
    const [, month, day] = iso.split('-');
    return `${day}/${month}`;
}

export function RetentionMatrix({ cohorts }: { cohorts: RetentionCohortRow[] }) {
    if (cohorts.length === 0) {
        return (
            <Text c="dimmed" fz="sm">
                Todavía no hay cohortes. Aparecen cuando alguien acepta la cookie de
                analítica y vuelve otra semana.
            </Text>
        );
    }

    const weeks = [...new Set(cohorts.map((row) => row.cohort_week))].sort().reverse();
    const maxOffset = Math.max(...cohorts.map((row) => row.week_offset));
    const offsets = Array.from({ length: maxOffset + 1 }, (_, index) => index);

    const byKey = new Map(cohorts.map((row) => [`${row.cohort_week}:${row.week_offset}`, row]));

    return (
        <Table.ScrollContainer minWidth={Math.max(420, 160 + offsets.length * 64)}>
            <Table withTableBorder verticalSpacing="xs" fz="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Semana de llegada</Table.Th>
                        <Table.Th ta="right">Visitantes</Table.Th>
                        {offsets.map((offset) => (
                            <Table.Th key={offset} ta="center">
                                {offset === 0 ? 'Semana 0' : `+${offset}`}
                            </Table.Th>
                        ))}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {weeks.map((week) => {
                        const size = byKey.get(`${week}:0`)?.cohort_size ?? 0;
                        return (
                            <Table.Tr key={week}>
                                <Table.Td fw={600}>{weekLabel(week)}</Table.Td>
                                <Table.Td ta="right" c="dimmed">{size}</Table.Td>
                                {offsets.map((offset) => {
                                    const row = byKey.get(`${week}:${offset}`);
                                    if (!row) {
                                        // Semana futura para esta cohorte: no es un
                                        // 0%, es que todavía no ha pasado.
                                        return <Table.Td key={offset} />;
                                    }
                                    return (
                                        <Table.Td key={offset} ta="center" style={cellStyle(row.rate)}>
                                            <Tooltip label={`${row.visitors} de ${row.cohort_size}`} withArrow>
                                                <Box component="span">{row.rate}%</Box>
                                            </Tooltip>
                                        </Table.Td>
                                    );
                                })}
                            </Table.Tr>
                        );
                    })}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}

export function RetentionLegend() {
    return (
        <Group gap="xs" mt="sm">
            <Text fz="xs" c="dimmed">Menos retención</Text>
            {[0, 25, 50, 75, 100].map((rate) => (
                <Box
                    key={rate}
                    w={22}
                    h={12}
                    style={{ borderRadius: 3, border: '1px solid var(--mantine-color-default-border)', ...cellStyle(rate) }}
                />
            ))}
            <Text fz="xs" c="dimmed">Más</Text>
        </Group>
    );
}
