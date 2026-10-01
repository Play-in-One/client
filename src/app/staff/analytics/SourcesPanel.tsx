'use client';

import dynamic from 'next/dynamic';
import { Alert, Box, Group, Progress, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';

import type { CampaignStat, SourceMetrics, SourcesReport, SourceStat } from '@/lib/types';
import { CHANNEL_LABELS } from './channels';

const SourcesChart = dynamic(() => import('./charts').then((m) => m.SourcesChart), { ssr: false });

function exits(row: { offer_clicks: number; store_clicks: number }): number {
    return row.offer_clicks + row.store_clicks;
}

function percent(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;
}

function count(value: number | null | undefined): string {
    return value == null ? '—' : value.toLocaleString('es-CL');
}

function FunnelCells({ row }: { row: SourceMetrics }) {
    return <>
        <Table.Td ta="right" fw={600}>{count(row.sessions)}</Table.Td>
        <Table.Td ta="right">{count(row.sessions_with_game_view)}</Table.Td>
        <Table.Td ta="right">{count(row.sessions_with_exit)}</Table.Td>
        <Table.Td ta="right">{count(exits(row))}</Table.Td>
        <Table.Td ta="right" c="dimmed">{percent(row.session_exit_rate)}</Table.Td>
    </>;
}

/**
 * De dónde llegan las visitas y cuáles terminan en una tienda.
 *
 * Cada sesión se atribuye entera al canal por el que entró (ver
 * `analytics/aggregation.sources`), así que los clics a tienda de la tabla son
 * los que hizo la gente que llegó por ese canal, en cualquier página.
 */
export function SourcesPanel({ report }: { report: SourcesReport }) {
    const total = report.totals.sessions;
    const unknown = report.channels.find((row) => row.channel === '')?.sessions ?? 0;
    const direct = report.channels.find((row) => row.channel === 'direct')?.sessions ?? 0;

    if (total === 0) {
        return <Text c="dimmed" fz="sm">Sin sesiones en este periodo.</Text>;
    }

    return (
        <Stack gap="lg">
            <Text fz="xs" c="dimmed">
                Las sesiones son estimadas por identificador y día. Una sesión puede hacer varios clics;
                la conversión cuenta las sesiones que salen a una tienda.
            </Text>
            {report.totals.funnel_complete !== true && (
                <Alert color="gray" variant="light">
                    El embudo no está disponible para todo el periodo.
                </Alert>
            )}
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Box><Text fz="sm" c="dimmed">Sesiones estimadas</Text><Text fw={700} fz="xl">{count(total)}</Text></Box>
                <Box><Text fz="sm" c="dimmed">Llegan a una ficha</Text><Text fw={700} fz="xl">{count(report.totals.sessions_with_game_view)}</Text><Text fz="xs" c="dimmed">{percent(report.totals.session_game_view_rate)}</Text></Box>
                <Box><Text fz="sm" c="dimmed">Salen a una tienda</Text><Text fw={700} fz="xl">{count(report.totals.sessions_with_exit)}</Text><Text fz="xs" c="dimmed">{percent(report.totals.session_exit_rate)}</Text></Box>
            </SimpleGrid>
            {unknown > 0 && (
                <Alert color="gray" variant="light">
                    {unknown.toLocaleString('es-CL')} sesiones son anteriores a que se midiera el
                    origen y aparecen como «Sin dato».
                </Alert>
            )}

            <SourcesChart series={report.series} />

            <Table.ScrollContainer minWidth={720}>
                <Table striped verticalSpacing="xs" fz="sm" aria-label="Embudo por canal">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Canal</Table.Th>
                            <Table.Th ta="right">Sesiones estimadas</Table.Th>
                            <Table.Th ta="right">Con ficha</Table.Th>
                            <Table.Th ta="right">Salen a tienda</Table.Th>
                            <Table.Th ta="right">Clics a tienda</Table.Th>
                            <Table.Th ta="right">Conversión</Table.Th>
                            <Table.Th w="22%">Del total</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {report.channels.map((row) => {
                            const share = (row.sessions / total) * 100;
                            return (
                                <Table.Tr key={row.channel || 'unknown'}>
                                    <Table.Td>{row.label}</Table.Td>
                                    <FunnelCells row={row} />
                                    <Table.Td>
                                        <Group gap="xs" wrap="nowrap">
                                            <Progress value={share} size="sm" radius="xl" style={{ flex: 1 }} aria-hidden />
                                            <Text fz="xs" c="dimmed" w={42} ta="right">{percent(share)}</Text>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                <Box>
                    <Title order={3} fz="sm" fw={700}>Orígenes concretos</Title>
                    <Text fz="xs" c="dimmed" mb="xs">
                        El sitio o la etiqueta <code>utm_source</code> dentro de cada canal.
                    </Text>
                    <SourceTable rows={report.top_sources} emptyLabel="Todo el tráfico llegó sin referrer ni etiqueta." />
                </Box>
                <Box>
                    <Title order={3} fz="sm" fw={700}>Campañas etiquetadas</Title>
                    <Text fz="xs" c="dimmed" mb="xs">
                        Enlaces con <code>utm_campaign</code>: bio de Instagram, anuncios, publicaciones.
                    </Text>
                    <SourceTable
                        rows={report.campaigns}
                        emptyLabel="Ningún enlace con utm_campaign en este periodo."
                        showCampaign
                    />
                </Box>
            </SimpleGrid>

            {/* Instagram y TikTok abren los enlaces en su navegador interno, que
                muchas veces no envía referrer: sin etiqueta, esa gente cuenta
                como directa. Solo se avisa cuando directo pesa lo bastante como
                para esconder algo. */}
            {direct / total > 0.4 && (
                <Text fz="xs" c="dimmed">
                    «Directo» incluye a quien llega desde apps que no informan el origen, como
                    Instagram o TikTok. Para separarlo, etiqueta tus enlaces:{' '}
                    <code>?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=bio</code>.
                </Text>
            )}
        </Stack>
    );
}

function SourceTable({
    rows,
    emptyLabel,
    showCampaign = false,
}: {
    rows: (SourceStat | CampaignStat)[];
    emptyLabel: string;
    showCampaign?: boolean;
}) {
    if (rows.length === 0) return <Text c="dimmed" fz="sm">{emptyLabel}</Text>;

    return (
        <Table.ScrollContainer minWidth={600}>
            <Table striped verticalSpacing="xs" fz="sm" aria-label={showCampaign ? 'Embudo por campaña' : 'Embudo por origen'}>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>{showCampaign ? 'Campaña' : 'Origen'}</Table.Th>
                        <Table.Th ta="right">Sesiones estimadas</Table.Th>
                        <Table.Th ta="right">Con ficha</Table.Th>
                        <Table.Th ta="right">Salen a tienda</Table.Th>
                        <Table.Th ta="right">Clics a tienda</Table.Th>
                        <Table.Th ta="right">Conversión</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => {
                        const campaign = showCampaign ? (row as CampaignStat) : null;
                        const key = [row.channel, row.source, campaign?.medium, campaign?.campaign].join('|');
                        return (
                            <Table.Tr key={key}>
                                <Table.Td>
                                    <Text fz="sm">{campaign ? campaign.campaign : row.source}</Text>
                                    <Text fz="xs" c="dimmed">
                                        {campaign
                                            ? [row.source, campaign.medium].filter(Boolean).join(' · ')
                                            : CHANNEL_LABELS[row.channel]}
                                    </Text>
                                </Table.Td>
                                <FunnelCells row={row} />
                            </Table.Tr>
                        );
                    })}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}
