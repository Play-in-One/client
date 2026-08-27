'use client';

import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';

import type { ActivityReport } from '@/lib/types';

/* Mapa de calor de uso: día de la semana × hora del día.
 *
 * Se dibuja con una grilla CSS y no con Recharts porque un heatmap es una
 * cuadrícula de celdas, no un gráfico de ejes: sale más legible, pesa nada y
 * no arrastra otra dependencia al bundle.
 *
 * Las horas son las del sitio (America/Santiago), no las del navegador de quien
 * mira: si un administrador viaja, el pico de las 21 sigue siendo el de las 21
 * en Chile. Por eso la zona se rotula explícitamente. */

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Referencia de la escala de color: el percentil 90 de las celdas con
 *  actividad, no el máximo.
 *
 *  Con el máximo, una sola hora excepcional (una campaña, un pico de un bot que
 *  se coló) deja las 167 celdas restantes casi transparentes y el mapa deja de
 *  distinguir el martes por la tarde del martes de madrugada. Anclando al p90,
 *  las celdas por encima simplemente saturan y el resto conserva su relieve. */
function scaleReference(values: number[]): number {
    const active = values.filter((value) => value > 0).sort((a, b) => a - b);
    if (active.length === 0) return 0;
    const index = Math.floor(active.length * 0.9);
    return active[Math.min(index, active.length - 1)];
}

/** Intensidad relativa a la referencia. Escala de raíz cuadrada: con una raíz,
 *  las horas flojas siguen distinguiéndose del vacío en vez de fundirse con el
 *  fondo. */
function cellStyle(events: number, reference: number): React.CSSProperties {
    if (events <= 0 || reference <= 0) {
        return { background: 'var(--mantine-color-default-hover)' };
    }
    const intensity = Math.min(Math.sqrt(events / reference), 1);
    const alpha = 0.15 + intensity * 0.75;
    return {
        background: `color-mix(in srgb, var(--mantine-color-violet-6) ${alpha * 100}%, transparent)`,
    };
}

function hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
}

export function ActivityHeatmap({ report }: { report: ActivityReport }) {
    const { matrix, max_events: max, peak, timezone } = report;

    // Índice por celda: la matriz llega completa (7×24), pero buscarla por
    // clave evita depender del orden en que venga.
    const byCell = new Map(matrix.map((cell) => [`${cell.weekday}:${cell.hour}`, cell]));
    const reference = scaleReference(matrix.map((cell) => cell.events));

    if (max === 0) {
        return (
            <Text c="dimmed" fz="sm">
                Todavía no hay actividad suficiente para dibujar el mapa. Aparece en cuanto
                el agregado diario procese el primer día con visitas.
            </Text>
        );
    }

    return (
        <Stack gap="sm">
            {peak && (
                <Text fz="sm" c="dimmed">
                    Hora punta: <b>{WEEKDAYS[peak.weekday]} a las {hourLabel(peak.hour)}</b>
                    {' '}({peak.events.toLocaleString('es-CL')} eventos en el periodo).
                </Text>
            )}

            <Box style={{ overflowX: 'auto' }}>
                <Box style={{ minWidth: 660 }}>
                    {/* Cabecera de horas. Se rotula una de cada tres para que las
                        etiquetas no se pisen en pantallas estrechas. */}
                    <Box
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '46px repeat(24, 1fr)',
                            gap: 2,
                            marginBottom: 4,
                        }}
                    >
                        <Box />
                        {HOURS.map((hour) => (
                            <Text key={hour} fz={9} c="dimmed" ta="center" lh={1}>
                                {hour % 3 === 0 ? hour : ''}
                            </Text>
                        ))}
                    </Box>

                    {WEEKDAYS_SHORT.map((label, weekday) => (
                        <Box
                            key={label}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '46px repeat(24, 1fr)',
                                gap: 2,
                                marginBottom: 2,
                            }}
                        >
                            <Text fz="xs" c="dimmed" ta="right" pr={6} style={{ lineHeight: '22px' }}>
                                {label}
                            </Text>
                            {HOURS.map((hour) => {
                                const cell = byCell.get(`${weekday}:${hour}`);
                                const events = cell?.events ?? 0;
                                return (
                                    <Tooltip
                                        key={hour}
                                        withArrow
                                        label={
                                            `${WEEKDAYS[weekday]} ${hourLabel(hour)} — ` +
                                            `${events} eventos · ${cell?.visitors ?? 0} visitantes` +
                                            (cell ? ` · media ${cell.avg_events}/${WEEKDAYS_SHORT[weekday].toLowerCase()}` : '')
                                        }
                                    >
                                        <Box
                                            h={22}
                                            style={{
                                                borderRadius: 3,
                                                cursor: 'default',
                                                ...cellStyle(events, reference),
                                            }}
                                        />
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            </Box>

            <Group justify="space-between" wrap="wrap" gap="xs">
                <Text fz="xs" c="dimmed">
                    Horas de {timezone.replace('_', ' ')}
                </Text>
                <Group gap={6}>
                    <Text fz="xs" c="dimmed">Menos</Text>
                    {[0, 0.15, 0.4, 0.7, 1].map((fraction) => (
                        <Box
                            key={fraction}
                            w={22}
                            h={12}
                            style={{
                                borderRadius: 3,
                                border: '1px solid var(--mantine-color-default-border)',
                                ...cellStyle(fraction * reference, reference),
                            }}
                        />
                    ))}
                    <Text fz="xs" c="dimmed">
                        Más ({reference.toLocaleString('es-CL')}+)
                    </Text>
                </Group>
            </Group>
        </Stack>
    );
}
