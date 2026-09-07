'use client';

import { useComputedColorScheme } from '@mantine/core';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import type { DailyFunnel, DailyTraffic, PagePerfRow, SellerStat } from '@/lib/types';

/* Gráficos del dashboard interno.
 *
 * Recharts se carga aquí y no en la página para que el `dynamic(...)` de
 * `AnalyticsClient` lo deje fuera del bundle inicial, igual que hace el detalle
 * de juego con `PriceHistoryChart`. */

const COLORS = {
    sessions: '#7C3AED',
    returning: '#0EA5E9',
    known: '#2563EB',
    fresh: '#22C55E',
    views: '#6366F1',
    clicks: '#F97316',
    offers: '#EF4444',
    lcp: '#8B5CF6',
    ttfb: '#06B6D4',
    server: '#F59E0B',
};

/** Etiqueta corta para el eje X: '2026-08-27' → '27/08'. */
function shortDate(value: string): string {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
}

function useAxisColor(): string {
    // El dashboard se usa en ambos temas y los ejes en gris fijo desaparecían
    // sobre el fondo oscuro.
    const scheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
    return scheme === 'dark' ? '#909296' : '#868e96';
}

const TOOLTIP_STYLE = {
    background: 'var(--mantine-color-body)',
    border: '1px solid var(--mantine-color-default-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--mantine-color-text)',
};

const TOOLTIP_LABEL_STYLE = {
    color: 'var(--mantine-color-text)',
};

export function VisitorsChart({ series }: { series: DailyTraffic[] }) {
    const axis = useAxisColor();
    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                    <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.sessions} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={COLORS.sessions} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} labelFormatter={shortDate} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                    type="monotone" dataKey="sessions" name="Sesiones"
                    stroke={COLORS.sessions} fill="url(#sessionsFill)" strokeWidth={2}
                />
                <Line type="monotone" dataKey="visitors_known" name="Identificados" stroke={COLORS.known} strokeWidth={2} dot={false} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="visitors_new" name="Nuevos" stroke={COLORS.fresh} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visitors_returning" name="Recurrentes" stroke={COLORS.returning} strokeWidth={2} dot={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function FunnelChart({ series }: { series: DailyFunnel[] }) {
    const axis = useAxisColor();
    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} labelFormatter={shortDate} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="game_clicks" name="Clics en tarjeta" stroke={COLORS.clicks} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="game_views" name="Fichas vistas" stroke={COLORS.views} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="offer_clicks" name="Clics a tienda" stroke={COLORS.offers} strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

export function SellersChart({ sellers }: { sellers: SellerStat[] }) {
    const axis = useAxisColor();
    const palette = ['#7C3AED', '#2563EB', '#6366F1', '#F97316', '#EF4444', '#22C55E', '#EAB308', '#14B8A6'];
    return (
        <ResponsiveContainer width="100%" height={Math.max(220, sellers.length * 34)}>
            <BarChart data={sellers} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} horizontal={false} />
                <XAxis type="number" stroke={axis} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke={axis} fontSize={11} width={130} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                <Bar dataKey="offer_clicks" name="Clics a tienda" radius={[0, 4, 4, 0]}>
                    {sellers.map((seller, index) => (
                        <Cell key={seller.name} fill={palette[index % palette.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

export function DevicesChart({ series }: { series: DailyTraffic[] }) {
    const axis = useAxisColor();
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} labelFormatter={shortDate} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="desktop_visits" name="Escritorio" stackId="d" fill={COLORS.known} />
                <Bar dataKey="mobile_visits" name="Móvil" stackId="d" fill={COLORS.sessions} />
                <Bar dataKey="tablet_visits" name="Tablet" stackId="d" fill={COLORS.fresh} />
            </BarChart>
        </ResponsiveContainer>
    );
}

/** Cómo evoluciona el p75 día a día: LCP, TTFB y tiempo de servidor.
 *
 *  Se dibuja el p75 y no la media porque la media de una página que va bien
 *  para casi todos y fatal para uno de cada veinte parece buena, y esos son
 *  justo los casos que hay que arreglar.
 *
 *  Los puntos vienen de la fila global de cada día (`page_path: ""`). No se
 *  puede componer a partir de las filas por ruta: un percentil no es promediable. */
export function PerfChart({ series }: { series: PagePerfRow[] }) {
    const axis = useAxisColor();
    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={axis} fontSize={11} />
                <YAxis
                    stroke={axis} fontSize={11} allowDecimals={false}
                    tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}`)}
                />
                <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    labelFormatter={shortDate}
                    formatter={(value: number) => `${Math.round(value)} ms`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="lcp_p75" name="LCP p75" stroke={COLORS.lcp} strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="ttfb_p75" name="TTFB p75" stroke={COLORS.ttfb} strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="server_p75" name="Servidor p75" stroke={COLORS.server} strokeWidth={2} dot={false} strokeDasharray="4 3" connectNulls />
            </LineChart>
        </ResponsiveContainer>
    );
}
