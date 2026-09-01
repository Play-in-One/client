'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    Alert,
    Anchor,
    Badge,
    Box,
    Card,
    Center,
    Container,
    Group,
    Loader,
    SegmentedControl,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Title,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowDownRight, IconArrowUpRight, IconMinus } from '@tabler/icons-react';

import {
    getAnalyticsActivity,
    getAnalyticsFunnel,
    getAnalyticsRetention,
    getAnalyticsSearch,
    getAnalyticsSummary,
    getAnalyticsTraffic,
} from '@/lib/api';
import type {
    ActivityReport,
    AnalyticsPeriod,
    AnalyticsSummary,
    FunnelReport,
    RetentionReport,
    SearchReport,
    TrafficReport,
} from '@/lib/types';
import { useAdmin } from '@/context/AdminContext';
import { RetentionLegend, RetentionMatrix } from './RetentionMatrix';
import { ActivityHeatmap } from './ActivityHeatmap';

// Recharts pesa: se carga aparte y solo en el cliente, igual que en el detalle
// de juego. El dashboard es interno y no necesita renderizarse en el servidor.
const VisitorsChart = dynamic(() => import('./charts').then((m) => m.VisitorsChart), { ssr: false });
const FunnelChart = dynamic(() => import('./charts').then((m) => m.FunnelChart), { ssr: false });
const SellersChart = dynamic(() => import('./charts').then((m) => m.SellersChart), { ssr: false });
const DevicesChart = dynamic(() => import('./charts').then((m) => m.DevicesChart), { ssr: false });

const RANGES = [
    { label: '7 días', value: '7' },
    { label: '30 días', value: '30' },
    { label: '90 días', value: '90' },
    { label: '1 año', value: '365' },
];

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

/** Variación porcentual frente al periodo anterior. `null` si no hay con qué comparar. */
function change(current: number, previous: number): number | null {
    if (!previous) return null;
    return Math.round(((current - previous) / previous) * 100);
}

function Kpi({
    label,
    value,
    delta,
    hint,
    /** true cuando bajar es bueno (rebote). */
    inverted = false,
}: {
    label: string;
    value: string;
    delta?: number | null;
    hint?: string;
    inverted?: boolean;
}) {
    const good = delta == null ? null : inverted ? delta < 0 : delta > 0;
    const Icon = delta == null || delta === 0 ? IconMinus : delta > 0 ? IconArrowUpRight : IconArrowDownRight;

    return (
        <Card withBorder radius="md" p="md">
            <Text fz="xs" tt="uppercase" c="dimmed" fw={700} style={{ letterSpacing: 0.5 }}>
                {label}
            </Text>
            <Group gap="xs" align="baseline" mt={4} wrap="nowrap">
                <Text fz={28} fw={700} lh={1.1}>{value}</Text>
                {delta != null && (
                    <Group gap={2} wrap="nowrap">
                        <Icon size={14} color={good === null ? undefined : `var(--mantine-color-${good ? 'teal' : 'red'}-6)`} />
                        <Text fz="xs" c={good === null ? 'dimmed' : good ? 'teal' : 'red'} fw={600}>
                            {Math.abs(delta)}%
                        </Text>
                    </Group>
                )}
            </Group>
            {hint && <Text fz="xs" c="dimmed" mt={4}>{hint}</Text>}
        </Card>
    );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <Card withBorder radius="md" p="lg">
            <Title order={2} fz="md" fw={700}>{title}</Title>
            {subtitle && <Text fz="xs" c="dimmed" mt={2} mb="md">{subtitle}</Text>}
            <Box mt={subtitle ? 0 : 'md'}>{children}</Box>
        </Card>
    );
}

interface Reports {
    summary: AnalyticsSummary;
    traffic: TrafficReport;
    funnel: FunnelReport;
    search: SearchReport;
    retention: RetentionReport;
    activity: ActivityReport;
}

export function AnalyticsClient() {
    const { isAdmin } = useAdmin();
    const [days, setDays] = useState('30');
    const [reports, setReports] = useState<Reports | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (range: number) => {
        setLoading(true);
        setError(null);
        try {
            const [summary, traffic, funnel, search, retention, activity] = await Promise.all([
                getAnalyticsSummary(range),
                getAnalyticsTraffic(range),
                getAnalyticsFunnel(range),
                getAnalyticsSearch(range),
                getAnalyticsRetention(12),
                getAnalyticsActivity(range),
            ]);
            setReports({ summary, traffic, funnel, search, retention, activity });
        } catch {
            setError('No se pudieron cargar las métricas. Revisa que la sesión siga activa.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) load(Number(days));
    }, [isAdmin, days, load]);

    if (!isAdmin) {
        return (
            <Container size="sm" py={60}>
                <Alert color="yellow" title="Necesitas iniciar sesión">
                    Este panel es solo para administradores.{' '}
                    <Anchor component={Link} href="/staff">Ir al inicio de sesión</Anchor>.
                </Alert>
            </Container>
        );
    }

    const current: AnalyticsPeriod | undefined = reports?.summary.current;
    const previous: AnalyticsPeriod | undefined = reports?.summary.previous;

    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" align="center" mb="lg" wrap="wrap">
                <Box>
                    <Title order={1} fz="h2">Analítica</Title>
                    <Text fz="sm" c="dimmed">
                        {reports ? `${reports.summary.start} → ${reports.summary.end}` : 'Cargando…'}
                    </Text>
                </Box>
                <SegmentedControl data={RANGES} value={days} onChange={setDays} size="sm" />
            </Group>

            {error && <Alert color="red" mb="lg">{error}</Alert>}

            {reports && reports.summary.known_coverage < 100 && (
                <Alert
                    color="blue"
                    icon={<IconAlertTriangle size={18} />}
                    title={`Las métricas de comportamiento cubren el ${reports.summary.known_coverage}% de la audiencia`}
                    mb="lg"
                >
                    «Visitas», «duración media», el rebote, el reparto por dispositivo y la
                    retención solo existen para quien aceptó la cookie de medición: sin ella
                    no hay noción de visita. El resto de cifras —sesiones, páginas vistas,
                    embudo, búsquedas— cubre a todo el mundo.
                </Alert>
            )}

            {loading && !reports && (
                <Center py={80}><Loader /></Center>
            )}

            {reports && current && previous && (
                <Stack gap="lg">
                    <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
                        <Kpi
                            label="Sesiones"
                            value={current.sessions.toLocaleString('es-CL')}
                            delta={change(current.sessions, previous.sessions)}
                            hint="Navegadores distintos por día, no personas"
                        />
                        <Kpi
                            label="Nuevos"
                            value={current.visitors_new.toLocaleString('es-CL')}
                            delta={change(current.visitors_new, previous.visitors_new)}
                            hint="Primera vez que aceptan"
                        />
                        <Kpi
                            label="Visitas"
                            value={current.visits.toLocaleString('es-CL')}
                            delta={change(current.visits, previous.visits)}
                            hint="Solo quienes aceptaron la cookie"
                        />
                        <Kpi
                            label="Clics a tienda"
                            value={current.offer_clicks.toLocaleString('es-CL')}
                            delta={change(current.offer_clicks, previous.offer_clicks)}
                            hint="La conversión real de PIO"
                        />
                        <Kpi
                            label="Ficha → tienda"
                            value={`${current.view_to_offer_rate}%`}
                            delta={change(current.view_to_offer_rate, previous.view_to_offer_rate)}
                        />
                        <Kpi
                            label="Duración media"
                            value={formatDuration(current.avg_visit_seconds)}
                            delta={change(current.avg_visit_seconds, previous.avg_visit_seconds)}
                            hint="Solo quienes aceptaron la cookie"
                        />
                    </SimpleGrid>

                    <Panel
                        title="Audiencia"
                        subtitle="Sesiones por día: navegadores distintos, no personas. «Identificados», «nuevos» y «recurrentes» solo cuentan a quien aceptó la cookie — sin ella no se puede saber si alguien vuelve."
                    >
                        <VisitorsChart series={reports.traffic.series} />
                    </Panel>

                    <Panel
                        title="Horarios de uso"
                        subtitle="Cuándo se usa la plataforma, por día de la semana y hora. Útil para elegir cuándo publicar, cuándo lanzar una oferta y a qué hora conviene desplegar."
                    >
                        <ActivityHeatmap report={reports.activity} />
                    </Panel>

                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Panel
                            title="Embudo hacia la tienda"
                            subtitle="Clic en la tarjeta → ficha del juego → clic a la tienda."
                        >
                            <FunnelChart series={reports.funnel.series} />
                        </Panel>
                        <Panel title="Dispositivos" subtitle="Visitas por tipo de dispositivo.">
                            <DevicesChart series={reports.traffic.series} />
                        </Panel>
                    </SimpleGrid>

                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Panel title="Juegos con más salida a tienda" subtitle="Ordenados por clics a la tienda en el periodo.">
                            {reports.funnel.top_games.length === 0 ? (
                                <Text c="dimmed" fz="sm">Sin datos en este periodo.</Text>
                            ) : (
                                <Table.ScrollContainer minWidth={420}>
                                    <Table striped verticalSpacing="xs" fz="sm">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Juego</Table.Th>
                                                <Table.Th ta="right">Fichas</Table.Th>
                                                <Table.Th ta="right">A tienda</Table.Th>
                                                <Table.Th ta="right">Conversión</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {reports.funnel.top_games.map((game) => (
                                                <Table.Tr key={`${game.game}-${game.name}`}>
                                                    <Table.Td>
                                                        {game.game ? (
                                                            <Anchor component={Link} href={`/game/${game.game}`} fz="sm">
                                                                {game.name}
                                                            </Anchor>
                                                        ) : (
                                                            <Text fz="sm" c="dimmed">{game.name} (borrado)</Text>
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td ta="right">{game.views}</Table.Td>
                                                    <Table.Td ta="right" fw={600}>{game.offer_clicks}</Table.Td>
                                                    <Table.Td ta="right" c="dimmed">
                                                        {game.views ? `${Math.round((game.offer_clicks / game.views) * 100)}%` : '—'}
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Table.ScrollContainer>
                            )}
                        </Panel>

                        <Panel title="Tráfico enviado a cada tienda" subtitle="Clics salientes por vendedor.">
                            {reports.funnel.top_sellers.length === 0 ? (
                                <Text c="dimmed" fz="sm">Sin datos en este periodo.</Text>
                            ) : (
                                <SellersChart sellers={reports.funnel.top_sellers} />
                            )}
                        </Panel>
                    </SimpleGrid>

                    <Panel
                        title="Salidas a redes sociales"
                        subtitle="Quince enlaces compiten por el mismo rincón del footer. Esto dice cuáles se ganan el sitio."
                    >
                        {reports.funnel.socials.length === 0 ? (
                            <Text c="dimmed" fz="sm">Nadie ha salido a una red en este periodo.</Text>
                        ) : (
                            <SocialTable rows={reports.funnel.socials} />
                        )}
                    </Panel>

                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Panel title="Búsquedas más frecuentes">
                            <SearchTable rows={reports.search.top_queries} emptyLabel="Nadie ha buscado todavía." />
                        </Panel>
                        <Panel
                            title="Búsquedas sin resultados"
                            subtitle="Lo que la gente buscó y no encontró: el hueco del catálogo, en sus propias palabras."
                        >
                            <SearchTable
                                rows={reports.search.zero_results}
                                emptyLabel="Ninguna búsqueda se quedó sin resultados."
                                highlight
                            />
                        </Panel>
                    </SimpleGrid>

                    <Panel
                        title="Retención por cohorte"
                        subtitle="De la gente que llegó cada semana, cuántos seguían volviendo después."
                    >
                        <RetentionMatrix cohorts={reports.retention.cohorts} />
                        <RetentionLegend />
                    </Panel>
                </Stack>
            )}
        </Container>
    );
}

/** Nombres tal como se leen, no como se guardan: la clave `twitter` es
    historia del modelo, no algo que nadie deba reconocer en un panel. */
const SOCIAL_LABELS: Record<string, string> = {
    instagram: 'Instagram', linkedin: 'LinkedIn', facebook: 'Facebook',
    twitter: 'X', youtube: 'YouTube', reddit: 'Reddit', tiktok: 'TikTok',
    pinterest: 'Pinterest', gmail: 'Correo', discord: 'Discord',
    spotify: 'Spotify', whatsapp: 'WhatsApp', threads: 'Threads',
    tumblr: 'Tumblr', telegram: 'Telegram',
};

function SocialTable({ rows }: { rows: FunnelReport['socials'] }) {
    const total = rows.reduce((sum, row) => sum + row.clicks, 0);
    return (
        <Table.ScrollContainer minWidth={320}>
            <Table striped verticalSpacing="xs" fz="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Red</Table.Th>
                        <Table.Th ta="right">Clics</Table.Th>
                        <Table.Th ta="right">Del total</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr key={row.network}>
                            <Table.Td>{SOCIAL_LABELS[row.network] ?? row.network}</Table.Td>
                            <Table.Td ta="right" fw={600}>{row.clicks}</Table.Td>
                            <Table.Td ta="right" c="dimmed">
                                {total ? `${Math.round((row.clicks / total) * 100)}%` : '—'}
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}

function SearchTable({
    rows,
    emptyLabel,
    highlight = false,
}: {
    rows: SearchReport['top_queries'];
    emptyLabel: string;
    highlight?: boolean;
}) {
    if (rows.length === 0) return <Text c="dimmed" fz="sm">{emptyLabel}</Text>;

    return (
        <Table.ScrollContainer minWidth={380}>
            <Table striped verticalSpacing="xs" fz="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Búsqueda</Table.Th>
                        <Table.Th ta="right">Veces</Table.Th>
                        <Table.Th ta="right">Resultados</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr key={row.query}>
                            <Table.Td>
                                <Anchor component={Link} href={`/search?q=${encodeURIComponent(row.query)}`} fz="sm">
                                    {row.query}
                                </Anchor>
                            </Table.Td>
                            <Table.Td ta="right" fw={600}>{row.searches}</Table.Td>
                            <Table.Td ta="right">
                                {row.avg_results == null ? (
                                    <Text fz="xs" c="dimmed">sin dato</Text>
                                ) : highlight ? (
                                    <Badge color="red" variant="light" size="sm">0</Badge>
                                ) : (
                                    <Text fz="sm" c="dimmed">{Math.round(row.avg_results)}</Text>
                                )}
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}
