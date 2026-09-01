'use client';

import { useId, useMemo } from 'react';
import { Box } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatCLP } from '@/lib/utils';
import { chart } from '@/lib/colors';
import { buildTimeTicks, timeTickFormatter, type ChartPoint } from '@/lib/priceSeries';

interface PriceHistoryChartProps {
    /** Puntos ya normalizados por buildPriceSeries: ascendentes, con bordes. */
    points: ChartPoint[];
    domain: [number, number];
}

/** recharts invoca esto por punto. Los sintéticos (el borde del rango y "ahora")
 *  no son mediciones, así que no llevan marca: un punto dibujado afirma que
 *  alguien registró ese precio ese día. Devuelve un <g/> vacío y no null porque
 *  el prop `dot` espera un ReactElement. `payload` existe en runtime pero no
 *  está en los tipos públicos de recharts, de ahí el tipo local. */
interface PriceDotProps {
    cx?: number;
    cy?: number;
    index?: number;
    payload?: ChartPoint;
}

function renderPriceDot({ cx, cy, index, payload }: PriceDotProps) {
    const key = `dot-${payload?.t ?? index}`;
    if (payload?.kind || cx == null || cy == null) return <g key={key} />;
    return (
        <circle
            key={key}
            cx={cx}
            cy={cy}
            r={4}
            fill="#fff"
            stroke="var(--mantine-color-primaryRed-5)"
            strokeWidth={2}
        />
    );
}

/** Evolución de un precio en el tiempo, con eje X proporcional.
 *
 * El eje era categórico: cada muestra ocupaba el mismo ancho, así que dos
 * cambios en una tarde se veían tan separados como dos meses de calma. Con
 * `type="number"` la escala pasa a ser continua y las distancias son reales.
 */
export default function PriceHistoryChart({ points, domain }: PriceHistoryChartProps) {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    // Id único por instancia: el gradiente vive en el DOM global. Se limpian
    // los ':' de useId porque el id termina dentro de un url(#...) del SVG.
    const gradientId = `price-${useId().replace(/:/g, '')}`;

    const ticks = useMemo(() => buildTimeTicks(domain), [domain]);
    const formatTick = useMemo(() => timeTickFormatter(domain), [domain]);

    return (
        <Box h={220}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--mantine-color-primaryRed-5)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--mantine-color-primaryRed-5)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="t"
                        type="number"
                        scale="time"
                        // Sin dominio explícito un eje numérico arranca en 0, o
                        // sea en 1970, y el gráfico se colapsa contra el borde.
                        domain={domain}
                        ticks={ticks}
                        interval="preserveStartEnd"
                        minTickGap={24}
                        padding={{ left: 4, right: 4 }}
                        tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatTick}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        formatter={(v: number) => [formatCLP(v), 'Precio']}
                        // La label llega como number: los puntos sintéticos se
                        // rotulan para no hacerlos pasar por una muestra real.
                        labelFormatter={(value: number, payload) => {
                            const kind = (payload?.[0]?.payload as ChartPoint | undefined)?.kind;
                            if (kind === 'now') return 'Precio actual';
                            if (kind === 'edge') return 'Vigente al inicio del rango';
                            return new Date(value).toLocaleDateString('es-CL');
                        }}
                        contentStyle={{
                            background: isDark ? chart.tooltipBg.dark : chart.tooltipBg.light,
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            color: isDark ? '#fff' : '#1F2937',
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke="var(--mantine-color-primaryRed-5)"
                        strokeWidth={3}
                        fill={`url(#${gradientId})`}
                        dot={renderPriceDot}
                        // Los tramos "sin stock" (price null) cortan la línea en
                        // vez de interpolar sobre el hueco.
                        connectNulls={false}
                        // Cada cambio de rango reemplaza la serie entera y la
                        // re-animación se ve como un parpadeo.
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Box>
    );
}
