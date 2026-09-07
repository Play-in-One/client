'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Alert,
    Badge,
    Box,
    Card,
    Center,
    Group,
    Loader,
    SegmentedControl,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Title,
    Tooltip,
} from '@mantine/core';

import { getAnalyticsPerformance, getAnalyticsSlowest } from '@/lib/api';
import type { PageLoadDetail, PagePerfRow, PerformanceReport, SlowestReport } from '@/lib/types';

// Igual que el resto del dashboard: Recharts fuera del bundle inicial.
const PerfChart = dynamic(() => import('./charts').then((m) => m.PerfChart), { ssr: false });

/* Cortes de Google para el LCP, los mismos que aplica el backend. Se repiten
   aquí porque el panel colorea celdas que el backend entrega en crudo. */
const LCP_GOOD_MS = 2500;
const LCP_POOR_MS = 4000;

const RANGES = [
    { label: '7 días', value: '7' },
    { label: '14 días', value: '14' },
    { label: '28 días', value: '28' },
];

const METRICS = [
    { label: 'LCP', value: 'lcp' },
    { label: 'TTFB', value: 'ttfb' },
    { label: 'Servidor', value: 'server' },
    { label: 'Carga', value: 'load' },
];

function ms(value: number | null | undefined): string {
    if (value == null) return '—';
    return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

function lcpColor(value: number | null): string | undefined {
    if (value == null) return undefined;
    if (value <= LCP_GOOD_MS) return 'teal';
    return value <= LCP_POOR_MS ? 'yellow' : 'red';
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <Card withBorder radius="md" p="md">
            <Text fz="xs" tt="uppercase" c="dimmed" fw={700} style={{ letterSpacing: 0.5 }}>
                {label}
            </Text>
            <Text fz={28} fw={700} lh={1.1} mt={4}>{value}</Text>
            {hint && <Text fz="xs" c="dimmed" mt={4}>{hint}</Text>}
        </Card>
    );
}

function Panel({ title, subtitle, children }: {
    title: string; subtitle?: string; children: React.ReactNode;
}) {
    return (
        <Card withBorder radius="md" p="lg">
            <Title order={2} fz="md" fw={700}>{title}</Title>
            {subtitle && <Text fz="xs" c="dimmed" mt={2} mb="md">{subtitle}</Text>}
            <Box mt={subtitle ? 0 : 'md'}>{children}</Box>
        </Card>
    );
}

/** Tabla de percentiles por ruta, de la más lenta a la más rápida. */
function ByPathTable({ rows }: { rows: PagePerfRow[] }) {
    if (rows.length === 0) {
        return <Text fz="sm" c="dimmed">Todavía no hay suficientes cargas medidas por página.</Text>;
    }
    return (
        <Table.ScrollContainer minWidth={720}>
            <Table highlightOnHover fz="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Página</Table.Th>
                        <Table.Th ta="right">Cargas</Table.Th>
                        <Table.Th ta="right">LCP p50</Table.Th>
                        <Table.Th ta="right">LCP p75</Table.Th>
                        <Table.Th ta="right">LCP p95</Table.Th>
                        <Table.Th ta="right">TTFB p75</Table.Th>
                        <Table.Th ta="right">Servidor p75</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr key={row.page_path}>
                            <Table.Td><Text fz="sm" ff="monospace">{row.page_path}</Text></Table.Td>
                            <Table.Td ta="right" c="dimmed">{row.samples}</Table.Td>
                            <Table.Td ta="right">{ms(row.lcp_p50)}</Table.Td>
                            <Table.Td ta="right">
                                <Badge color={lcpColor(row.lcp_p75)} variant="light" size="sm">
                                    {ms(row.lcp_p75)}
                                </Badge>
                            </Table.Td>
                            <Table.Td ta="right">{ms(row.lcp_p95)}</Table.Td>
                            <Table.Td ta="right">{ms(row.ttfb_p75)}</Table.Td>
                            <Table.Td ta="right">{ms(row.server_p75)}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}

/** Las cargas concretas más lentas: el desglose de dónde se fue el tiempo. */
function SlowestTable({ rows }: { rows: PageLoadDetail[] }) {
    if (rows.length === 0) {
        return <Text fz="sm" c="dimmed">Ninguna carga registrada en este periodo.</Text>;
    }
    return (
        <Table.ScrollContainer minWidth={900}>
            <Table highlightOnHover fz="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Cuándo</Table.Th>
                        <Table.Th>Página</Table.Th>
                        <Table.Th ta="right">LCP</Table.Th>
                        <Table.Th ta="right">TTFB</Table.Th>
                        <Table.Th ta="right">Django</Table.Th>
                        <Table.Th ta="right">Next</Table.Th>
                        <Table.Th ta="right">Llamadas</Table.Th>
                        <Table.Th>Contexto</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr key={row.id}>
                            <Table.Td>
                                <Text fz="xs" c="dimmed">
                                    {new Date(row.created_at).toLocaleString('es-CL', {
                                        day: '2-digit', month: '2-digit',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </Text>
                            </Table.Td>
                            <Table.Td><Text fz="xs" ff="monospace">{row.page_path}</Text></Table.Td>
                            <Table.Td ta="right">
                                <Badge color={lcpColor(row.lcp_ms)} variant="light" size="sm">
                                    {ms(row.lcp_ms)}
                                </Badge>
                            </Table.Td>
                            <Table.Td ta="right">{ms(row.ttfb_ms)}</Table.Td>
                            <Table.Td ta="right">
                                {/* El único dato que viene del propio servidor y no
                                    de lo que reportó el navegador. */}
                                <Tooltip
                                    label={row.server_view
                                        ? `${row.server_view} · ${row.server_queries ?? '?'} consultas`
                                        : 'Sin correlación con el backend'}
                                    withArrow
                                >
                                    <Text fz="sm" span>{ms(row.server_ms)}</Text>
                                </Tooltip>
                            </Table.Td>
                            <Table.Td ta="right">
                                {/* No se mide: es el TTFB menos lo que fue Django.
                                    Incluye la red interna entre los dos, que es
                                    despreciable dentro del mismo host. */}
                                <Tooltip label="Primer byte menos el tiempo de Django" withArrow>
                                    <Text fz="sm" span>{ms(row.frontend_ms)}</Text>
                                </Tooltip>
                            </Table.Td>
                            <Table.Td ta="right">
                                {row.api_calls == null ? '—' : `×${row.api_calls}`}
                            </Table.Td>
                            <Table.Td>
                                <Group gap={4} wrap="nowrap">
                                    {row.cache_state && (
                                        <Badge size="xs" variant="outline"
                                            color={row.cache_state === 'hit' ? 'gray' : 'blue'}>
                                            {row.cache_state}
                                        </Badge>
                                    )}
                                    {row.device_type && (
                                        <Badge size="xs" variant="default">{row.device_type}</Badge>
                                    )}
                                    {row.connection_type && (
                                        <Badge size="xs" variant="default">{row.connection_type}</Badge>
                                    )}
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}

/**
 * Cuánto tarda el sitio en cargar de verdad, medido en el dispositivo de quien
 * lo visita.
 *
 * Se mira en dos niveles a propósito. Los percentiles dicen si el sitio está
 * bien o mal en general; la tabla de peores casos es la que permite mirar UNA
 * carga concreta y ver si el tiempo se fue en la red, en el render o en Django.
 */
export function PerformancePanel() {
    const [days, setDays] = useState('7');
    const [metric, setMetric] = useState('lcp');
    const [report, setReport] = useState<PerformanceReport | null>(null);
    const [slowest, setSlowest] = useState<SlowestReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (range: number, sortBy: string) => {
        setLoading(true);
        setError(null);
        try {
            const [perf, worst] = await Promise.all([
                getAnalyticsPerformance(range),
                getAnalyticsSlowest(range, sortBy),
            ]);
            setReport(perf);
            setSlowest(worst);
        } catch {
            setError('No se pudieron cargar los tiempos de carga.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(Number(days), metric); }, [days, metric, load]);

    if (loading && !report) {
        return <Center py="xl"><Loader /></Center>;
    }
    if (error) return <Alert color="red">{error}</Alert>;
    if (!report) return null;

    const totals = report.totals as PagePerfRow;
    const measured = totals.samples ?? 0;

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="wrap">
                <Box>
                    <Title order={2} fz="h3">Tiempos de carga</Title>
                    <Text fz="sm" c="dimmed">
                        {report.start} → {report.end} · {measured.toLocaleString('es-CL')} cargas medidas
                    </Text>
                </Box>
                <SegmentedControl data={RANGES} value={days} onChange={setDays} size="sm" />
            </Group>

            {report.truncated && (
                <Alert color="blue">
                    Solo se conservan {report.raw_window_days} días de cargas en detalle, así que
                    el rango se recortó. Los percentiles diarios del gráfico sí llegan más atrás.
                </Alert>
            )}

            {measured === 0 ? (
                <Alert color="yellow" title="Todavía no hay mediciones">
                    Las cargas se registran cuando alguien visita el sitio y cierra o abandona la
                    página. Si acabas de desplegar, dale unas horas.
                </Alert>
            ) : (
                <>
                    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                        <Kpi label="LCP p75" value={ms(totals.lcp_p75)}
                            hint="Tres de cada cuatro cargas van por debajo" />
                        <Kpi label="TTFB p75" value={ms(totals.ttfb_p75)}
                            hint="Hasta el primer byte" />
                        <Kpi label="Servidor p75" value={ms(totals.server_p75)}
                            hint="Lo que tardó Django" />
                        <Kpi label="Cargas buenas"
                            value={`${totals.good_lcp_rate ?? Math.round((totals.good_lcp / measured) * 100)}%`}
                            hint={`LCP bajo ${LCP_GOOD_MS / 1000} s`} />
                    </SimpleGrid>

                    <Panel
                        title="Evolución"
                        subtitle="p75 del sitio entero, día a día. Se calcula sobre todas las páginas juntas: un percentil no se puede promediar."
                    >
                        <PerfChart series={report.series} />
                    </Panel>

                    <Panel
                        title="Por página"
                        subtitle="De la más lenta a la más rápida. Solo se listan las rutas con suficientes cargas para que un percentil signifique algo."
                    >
                        <ByPathTable rows={report.by_path} />
                    </Panel>

                    <Panel
                        title="Las cargas más lentas"
                        subtitle="Casos concretos, con el reparto del tiempo entre red, render y backend."
                    >
                        <Group mb="md">
                            <Text fz="xs" c="dimmed">Ordenar por</Text>
                            <SegmentedControl data={METRICS} value={metric} onChange={setMetric} size="xs" />
                        </Group>
                        <SlowestTable rows={slowest?.results ?? []} />
                    </Panel>
                </>
            )}
        </Stack>
    );
}
