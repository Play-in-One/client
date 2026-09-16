import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Container, Title, Text, Box, Group } from '@mantine/core';
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

/** "16/09/2026, 21:26" en hora de Chile, sin depender del huso del cliente. */
function formatRunDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Santiago',
    }).format(date);
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
                    ...stats.platform_matrix.flatMap((r) => [r.new, r.used, r.digital]),
                );
                return (
                    <Box className="content-card" p={0} mb="xs" style={{ overflowX: 'auto' }}>
                        <table className="scrap-table">
                            <colgroup>
                                <col style={{ width: '30%' }} />
                                <col style={{ width: '23.33%' }} />
                                <col style={{ width: '23.33%' }} />
                                <col style={{ width: '23.33%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Plataforma</th>
                                    <th className="value-col">Nuevo</th>
                                    <th className="value-col">Usado</th>
                                    <th className="value-col">Digital</th>
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
                                            <td className="value-col" style={heatCellStyle(row.digital, maxCount)}>
                                                {row.digital.toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
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
            <Box className="content-card" p="xl">
                <Title order={2} fz="lg" mb="md">Último scrapeo</Title>
                {stats?.last_run ? (
                    <>
                        <Text c="dimmed" mb="lg">{formatRunDate(stats.last_run.finished_at)}</Text>
                        <Group gap={40} wrap="wrap">
                            <Box>
                                <Text fz={22} fw={800}>
                                    {stats.last_run.products_created.toLocaleString('es-CL')}
                                </Text>
                                <Text fz="sm" c="dimmed">productos nuevos</Text>
                            </Box>
                            <Box>
                                <Text fz={22} fw={800}>
                                    {stats.last_run.products_updated.toLocaleString('es-CL')}
                                </Text>
                                <Text fz="sm" c="dimmed">productos actualizados</Text>
                            </Box>
                            <Box>
                                <Text fz={22} fw={800}>
                                    {stats.last_run.products_skipped.toLocaleString('es-CL')}
                                </Text>
                                <Text fz="sm" c="dimmed">productos sin cambios</Text>
                                <Text fz="xs" c="dimmed" maw={200}>
                                    El scraper los revisó de nuevo, pero su precio no cambió.
                                </Text>
                            </Box>
                            <Box>
                                <Text fz={22} fw={800}>
                                    {stats.last_run.products_price_decreased.toLocaleString('es-CL')}
                                </Text>
                                <Text fz="sm" c="dimmed">bajaron de precio</Text>
                            </Box>
                        </Group>
                    </>
                ) : (
                    <Text c="dimmed">Aún no hay una corrida de scrapeo finalizada.</Text>
                )}
            </Box>

            {stats && <JsonLd data={datasetJsonLd(stats)} />}
        </Container>
    );
}
