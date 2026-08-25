'use client';

import { useId } from 'react';
import { Box, Text, useMantineColorScheme } from '@mantine/core';
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

/** Acepta tanto PriceHistory (por producto) como MinPricePoint (mínimo por
 *  consola); este último puede traer price = null para marcar "sin stock". */
interface PricePoint {
    price: string | null;
    timestamp: string;
}

interface ProductPriceChartProps {
    prices: PricePoint[];
    size?: 'sm' | 'lg';
    onClick?: () => void;
}

export default function ProductPriceChart({ prices, size = 'sm', onClick }: ProductPriceChartProps) {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    // Id único por instancia: el gradiente vive en el DOM global y antes se
    // repetía en cada fila de la tabla de productos. Se limpian los ':' de
    // useId porque el id termina dentro de un url(#...) del SVG.
    const gradientId = `price-${useId().replace(/:/g, '')}`;

    const points = [...prices]
        .reverse()
        .map((p) => ({ date: p.timestamp, price: p.price === null ? null : parseFloat(p.price) }));

    // Un solo punto (o ninguno) no dibuja línea; los huecos de "sin stock" no
    // cuentan como datos.
    if (points.filter((p) => p.price !== null).length < 2) {
        return (
            <Text fz="xs" c="dimmed">
                —
            </Text>
        );
    }

    if (size === 'sm') {
        return (
            <Box w={80} h={32} onClick={onClick}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} style={{ cursor: onClick ? 'pointer' : 'default' }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--mantine-color-primaryRed-5)" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="var(--mantine-color-primaryRed-5)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke="var(--mantine-color-primaryRed-5)"
                            strokeWidth={1.5}
                            fill={`url(#${gradientId})`}
                            dot={false}
                            connectNulls={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        );
    }

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
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) => new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        formatter={(v: number) => [formatCLP(v), 'Precio']}
                        labelFormatter={(v: string) => new Date(v).toLocaleDateString('es-CL')}
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
                        dot={{ r: 4, fill: '#fff', stroke: 'var(--mantine-color-primaryRed-5)', strokeWidth: 2 }}
                        connectNulls={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Box>
    );
}
