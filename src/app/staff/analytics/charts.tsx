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

import type { DailyFunnel, DailyTraffic, SellerStat } from '@/lib/types';

/* Gráficos del dashboard interno.
 *
 * Recharts se carga aquí y no en la página para que el `dynamic(...)` de
 * `AnalyticsClient` lo deje fuera del bundle inicial, igual que hace el detalle
 * de juego con `ProductPriceChart`. */

const COLORS = {
    visitors: '#7C3AED',
    known: '#2563EB',
    fresh: '#22C55E',
    views: '#6366F1',
    clicks: '#F97316',
    offers: '#EF4444',
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
};

export function VisitorsChart({ series }: { series: DailyTraffic[] }) {
    const axis = useAxisColor();
    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                    <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.visitors} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={COLORS.visitors} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                    type="monotone" dataKey="visitors" name="Visitantes únicos"
                    stroke={COLORS.visitors} fill="url(#visitorsFill)" strokeWidth={2}
                />
                <Line type="monotone" dataKey="visitors_new" name="Nuevos" stroke={COLORS.fresh} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visitors_returning" name="Recurrentes" stroke={COLORS.known} strokeWidth={2} dot={false} />
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
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
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
                <Tooltip contentStyle={TOOLTIP_STYLE} />
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
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="desktop_visits" name="Escritorio" stackId="d" fill={COLORS.known} />
                <Bar dataKey="mobile_visits" name="Móvil" stackId="d" fill={COLORS.visitors} />
                <Bar dataKey="tablet_visits" name="Tablet" stackId="d" fill={COLORS.fresh} />
            </BarChart>
        </ResponsiveContainer>
    );
}
