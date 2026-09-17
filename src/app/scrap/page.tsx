import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Container, Title, Text, Box, Group } from '@mantine/core';
import {
    IconCalendarClock,
    IconCloudDownload,
    IconKey,
    IconRecycle,
    IconRefresh,
    IconSparkles,
    IconTrendingDown,
} from '@tabler/icons-react';
import { buildMetadata, datasetJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { getStats } from '@/lib/api';
import type { Stats } from '@/lib/types';
import { PLATFORMS_BY_SLUG, FALLBACK_PLATFORM_ICON } from '@/lib/platforms';
import StatsCounterClient from './StatsCounterClient';

/* Mapa de calor: un solo hue (la marca, `primaryRed`), claro→oscuro según
   magnitud — nunca un arcoíris (ver skill de dataviz). Normalizado contra el
   máximo GLOBAL de toda la matriz (no por columna), para que el color
   responda "¿dónde se concentra el catálogo?" en vez de "¿qué es lo más alto
   de ESTA columna?". `Math.sqrt` comprime la asimetría de los conteos (unas
   pocas celdas gigantes no deben apagar el resto a blanco). 0 se deja sin
   color: la escala secuencial ya empieza pálida y confundiría "poco" con
   "nada". */
function heatStep(value: number, max: number): number {
    if (value <= 0 || max <= 0) return 0;
    return Math.min(9, Math.max(1, Math.round(Math.sqrt(value / max) * 9)));
}

/* El extremo "casi nada" tiene que fundirse con la superficie de CADA tema
   (mismo criterio que `.content-card`: dark mode es su propio paso, nunca
   el mismo hex que claro — ver skill de dataviz, "not an automatic flip").
   Se mezcla el paso 6 de `primaryRed` (el tono más saturado que se sigue
   viendo bien con texto blanco) hacia la superficie real de la tarjeta
   (`light-dark(white, dark-6)`) en proporción a la magnitud: 0% en el
   mínimo (cae en la superficie, invisible a propósito) y 100% en el
   máximo (el rojo puro, igual en los dos temas). */
function heatCellStyle(value: number, max: number): CSSProperties {
    const step = heatStep(value, max);
    if (step === 0) return {};
    const pct = Math.round((step / 9) * 100);
    // Contraste calculado, no adivinado: en oscuro el rango entero (casi negro
    // → rojo saturado) es oscuro, así que el texto blanco sirve siempre. En
    // claro, el mismo % está mezclado hacia blanco y recién a partir de un
    // paso alto el fondo es lo bastante oscuro para pedir texto blanco.
    const lightText = step >= 5 ? 'var(--mantine-color-white)' : 'var(--mantine-color-black)';
    return {
        backgroundColor:
            `color-mix(in oklab, var(--mantine-color-primaryRed-6) ${pct}%, ` +
            'light-dark(white, var(--mantine-color-dark-6)))',
        color: `light-dark(${lightText}, var(--mantine-color-white))`,
    };
}

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
    title: 'Estadísticas de PlayinOne',
    description:
        'Cuántas tiendas, juegos y productos compara Play in One, desglosados por consola y formato, y el detalle del último scrapeo.',
    path: '/scrap',
});

/** "16/09/2026 - 21:26" en hora de Chile, sin depender del huso del cliente. */
function formatRunDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const options = { timeZone: 'America/Santiago' };
    const day = new Intl.DateTimeFormat('es-CL', {
        ...options, day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(date);
    const time = new Intl.DateTimeFormat('es-CL', {
        ...options, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(date);
    return `${day} - ${time}`;
}

export default async function ScrapStatsPage() {
    let stats: Stats | null = null;
    try {
        stats = await getStats();
    } catch {
        // La página igual se sirve; cada sección chequea `stats` por separado.
    }

    return (
        <Container size="md" py={60}>
            <Group justify="center" gap="xs" mb="xs">
                <Image
                    src="/PIO-punto-negro.svg"
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="logo-mark-light"
                />
                <Image
                    src="/PIO.svg"
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="logo-mark-dark"
                />
                <Title order={1} ta="center">Estadísticas de PlayinOne</Title>
            </Group>

            {stats && (
                <StatsCounterClient
                    sellers={stats.sellers}
                    games={stats.games}
                    products={stats.products}
                />
            )}

            {/* ══ Matriz plataforma × formato (mapa de calor) ══ */}
            {stats && stats.platform_matrix.length > 0 && (() => {
                const maxCount = Math.max(
                    ...stats.platform_matrix.flatMap((r) => [r.new, r.used, r.store, r.key]),
                );
                const totals = stats.platform_matrix.reduce(
                    (sum, row) => ({
                        new: sum.new + row.new,
                        used: sum.used + row.used,
                        store: sum.store + row.store,
                        key: sum.key + row.key,
                    }),
                    { new: 0, used: 0, store: 0, key: 0 },
                );
                const totalFor = (row: typeof stats.platform_matrix[number]) =>
                    row.new + row.used + row.store + row.key;
                const grandTotal = totals.new + totals.used + totals.store + totals.key;
                return (
                    <Box className="content-card" p={0} mb="xs" style={{ overflowX: 'auto' }}>
                        <table className="scrap-table">
                            <colgroup>
                                <col style={{ width: '28%' }} />
                                <col style={{ width: '14.4%' }} />
                                <col style={{ width: '14.4%' }} />
                                <col style={{ width: '14.4%' }} />
                                <col style={{ width: '14.4%' }} />
                                <col style={{ width: '14.4%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Plataforma</th>
                                    <th className="value-col">
                                        <Group gap={4} justify="center" wrap="nowrap">
                                            <IconSparkles size={16} /><span>Nuevo</span>
                                        </Group>
                                    </th>
                                    <th className="value-col">
                                        <Group gap={4} justify="center" wrap="nowrap">
                                            <IconRecycle size={16} /><span>Usado</span>
                                        </Group>
                                    </th>
                                    <th className="value-col">
                                        <Group gap={4} justify="center" wrap="nowrap">
                                            <IconCloudDownload size={16} /><span>Store</span>
                                        </Group>
                                    </th>
                                    <th className="value-col">
                                        <Group gap={4} justify="center" wrap="nowrap">
                                            <IconKey size={16} /><span>Key</span>
                                        </Group>
                                    </th>
                                    <th className="value-col total-col">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.platform_matrix.map((row) => {
                                    const def = PLATFORMS_BY_SLUG[row.slug];
                                    const Icon = def?.icon ?? FALLBACK_PLATFORM_ICON;
                                    return (
                                        <tr key={row.slug}>
                                            <td>
                                                <Group gap={8} wrap="nowrap">
                                                    <Icon size={20} color={def?.hex} />
                                                    <Text fz="sm">{row.long_name}</Text>
                                                </Group>
                                            </td>
                                            <td className="value-col" style={heatCellStyle(row.new, maxCount)}>
                                                {row.new.toLocaleString('es-CL')}
                                            </td>
                                            <td className="value-col" style={heatCellStyle(row.used, maxCount)}>
                                                {row.used.toLocaleString('es-CL')}
                                            </td>
                                            <td className="value-col" style={heatCellStyle(row.store, maxCount)}>
                                                {row.store.toLocaleString('es-CL')}
                                            </td>
                                            <td className="value-col" style={heatCellStyle(row.key, maxCount)}>
                                                {row.key.toLocaleString('es-CL')}
                                            </td>
                                            <td className="value-col total-col">
                                                {totalFor(row).toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th>Total</th>
                                    <td className="value-col">{totals.new.toLocaleString('es-CL')}</td>
                                    <td className="value-col">{totals.used.toLocaleString('es-CL')}</td>
                                    <td className="value-col">{totals.store.toLocaleString('es-CL')}</td>
                                    <td className="value-col">{totals.key.toLocaleString('es-CL')}</td>
                                    <td className="value-col total-col">{grandTotal.toLocaleString('es-CL')}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </Box>
                );
            })()}
            {stats && stats.platform_matrix.length > 0 && (
                <>
                    <Text fz="xs" c="dimmed" ta="right" mb="xl" className="heat-caption-light">
                        Más oscuro = más productos activos en esa combinación.
                    </Text>
                    <Text fz="xs" c="dimmed" ta="right" mb="xl" className="heat-caption-dark">
                        Más intenso = más productos activos en esa combinación.
                    </Text>
                </>
            )}

            {/* ══ Último scrapeo ══ */}
            <Box className="scrape-summary" py="xl">
                {stats?.last_run ? (
                    <Box>
                        <Group justify="space-between" align="flex-start" gap="md" mb="lg" wrap="wrap">
                            <Box>
                                <Title order={2} fz="lg">Último scrapeo</Title>
                                <Text fz="sm" c="dimmed" mt={2}>
                                    Resumen de la última actualización del catálogo.
                                </Text>
                            </Box>
                            <Group className="scrape-run-date" gap={8} wrap="nowrap">
                                <Box>
                                    <Text className="scrape-run-date-label">Última ejecución</Text>
                                    <Text className="scrape-run-date-value">
                                        {formatRunDate(stats.last_run.finished_at)}
                                    </Text>
                                </Box>
                                <IconCalendarClock size={23} stroke={2.25} />
                            </Group>
                        </Group>

                        <div className="scrape-kpi-grid">
                            <Box className="scrape-kpi scrape-kpi-created">
                                <Group className="scrape-kpi-heading" gap={6} wrap="nowrap">
                                    <IconSparkles className="scrape-kpi-icon" size={19} />
                                    <Text className="scrape-kpi-label">Productos nuevos</Text>
                                </Group>
                                <Text className="scrape-kpi-value">
                                    {stats.last_run.products_created.toLocaleString('es-CL')}
                                </Text>
                                <Text className="scrape-kpi-hint">Incorporados al catálogo</Text>
                            </Box>
                            <Box className="scrape-kpi scrape-kpi-updated">
                                <Group className="scrape-kpi-heading" gap={6} wrap="nowrap">
                                    <IconRefresh className="scrape-kpi-icon" size={19} />
                                    <Text className="scrape-kpi-label">Actualizados</Text>
                                </Group>
                                <Text className="scrape-kpi-value">
                                    {stats.last_run.products_updated.toLocaleString('es-CL')}
                                </Text>
                                <Text className="scrape-kpi-hint">Con cambios detectados</Text>
                            </Box>
                            <Box className="scrape-kpi scrape-kpi-unchanged">
                                <Group className="scrape-kpi-heading" gap={6} wrap="nowrap">
                                    <IconRecycle className="scrape-kpi-icon" size={19} />
                                    <Text className="scrape-kpi-label">Sin cambios</Text>
                                </Group>
                                <Text className="scrape-kpi-value">
                                    {stats.last_run.products_skipped.toLocaleString('es-CL')}
                                </Text>
                                <Text className="scrape-kpi-hint">Revisados, con el mismo precio</Text>
                            </Box>
                            <Box className="scrape-kpi scrape-kpi-price-drop">
                                <Group className="scrape-kpi-heading" gap={6} wrap="nowrap">
                                    <IconTrendingDown className="scrape-kpi-icon" size={19} />
                                    <Text className="scrape-kpi-label">Bajaron de precio</Text>
                                </Group>
                                <Text className="scrape-kpi-value">
                                    {stats.last_run.products_price_decreased.toLocaleString('es-CL')}
                                </Text>
                                <Text className="scrape-kpi-hint">Ofertas con menor precio</Text>
                            </Box>
                        </div>
                    </Box>
                ) : (
                    <Box className="scrape-empty-state">
                        <Title order={2} fz="lg" mb={4}>Último scrapeo</Title>
                        <Text c="dimmed">Aún no hay una corrida de scrapeo finalizada.</Text>
                    </Box>
                )}
            </Box>

            {stats && <JsonLd data={datasetJsonLd(stats)} />}
        </Container>
    );
}
