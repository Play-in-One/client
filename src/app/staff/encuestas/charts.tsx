'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE, useAxisColor } from '../analytics/charts';

/* Gráficos de resultados de encuestas. Van en su propio módulo para que el
   `dynamic(...)` del panel deje recharts fuera del bundle inicial. */

export function ChoiceBarChart({ choices }: { choices: { label: string; count: number }[] }) {
    const axis = useAxisColor();
    return (
        <ResponsiveContainer width="100%" height={Math.max(120, choices.length * 36)}>
            <BarChart data={choices} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} horizontal={false} />
                <XAxis type="number" stroke={axis} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="label" stroke={axis} fontSize={11} width={160} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                <Bar dataKey="count" name="Respuestas" fill="#7C3AED" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function SliderHistogram({ histogram }: { histogram: { value: number; count: number }[] }) {
    const axis = useAxisColor();
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={histogram} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} opacity={0.15} vertical={false} />
                <XAxis dataKey="value" stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                <Bar dataKey="count" name="Respuestas" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
