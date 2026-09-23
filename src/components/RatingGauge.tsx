'use client';

import { useEffect, useState } from 'react';
import { Box, Stack, Text, Tooltip } from '@mantine/core';
import type { IconType } from 'react-icons';
import { ratingColor } from '@/lib/colors';

interface RatingGaugeProps {
    value: number;
    label: string;
    icon: IconType;
    count?: number | null;
    testId: string;
    /** Ancho máximo del gauge en px; el trazo escala con él. Default 76 (el
     *  tamaño de los gauges por fuente); el del promedio pasa uno mayor. */
    size?: number;
}

const DEFAULT_SIZE = 76;
const ROTATION = 135;

export default function RatingGauge({ value, label, icon: Icon, count, testId, size = DEFAULT_SIZE }: RatingGaugeProps) {
    const stroke = size * (7 / DEFAULT_SIZE);
    const radius = (size - stroke) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    // Arco de 3/4 de círculo (270°): deja abierto el cuarto inferior, como un
    // velocímetro. La rotación de 135° centra ese hueco en la base.
    const arcLength = circumference * (270 / 360);
    const gapLength = circumference - arcLength;

    const clamped = Math.max(0, Math.min(10, value));
    const displayValue = clamped.toFixed(1);
    // Mismo color en las tres fuentes: lo que cambia es la nota, no la marca —
    // así el color es comparable entre gauges de un vistazo (semántico, no
    // decorativo). Misma escala que el badge agregado de la ficha.
    const color = `var(--mantine-color-${ratingColor(clamped)}-5)`;
    // El truco de dasharray/dashoffset sobre un arco de 270° (en vez del círculo
    // completo) sólo ROTA el segmento visible al variar el offset — no lo hace
    // crecer. Por eso el "on" del progreso es la CIRCUNFERENCIA completa (mismo
    // punto de partida que la pista) y el offset revela un prefijo contiguo de
    // longitud `progressLength`, capado a como mucho el arco de 270°.
    const progressLength = arcLength * (clamped / 10);
    // Arranca oculto (offset = circunferencia completa) y en el siguiente frame
    // anima hacia el valor real, para que el arco "crezca" al montar.
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setOffset(circumference - progressLength);
        });
        return () => cancelAnimationFrame(frame);
    }, [progressLength]);

    const scale = size / DEFAULT_SIZE;

    return (
        <Stack
            align="center"
            gap={4}
            data-testid={testId}
            role="img"
            aria-label={`${label}: ${displayValue} de 10`}
        >
            <Box style={{ position: 'relative', width: '100%', maxWidth: size, aspectRatio: '1' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="var(--mantine-color-default-border)"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${arcLength} ${gapLength}`}
                        transform={`rotate(${ROTATION} ${center} ${center})`}
                    />
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={offset}
                        transform={`rotate(${ROTATION} ${center} ${center})`}
                        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
                    />
                </svg>
                <Box
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text fz={Math.round(14 * scale)} fw={700}>{displayValue}/10</Text>
                </Box>
                {/* En el hueco de la base del arco, no debajo de todo el gauge. */}
                <Tooltip label={label} withArrow>
                    <Box
                        style={{
                            position: 'absolute',
                            bottom: '2%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                        }}
                    >
                        <Icon size={Math.round(16 * scale)} color="var(--mantine-color-dimmed)" aria-hidden />
                    </Box>
                </Tooltip>
            </Box>
            {count != null && (
                <Text fz="xs" c="dimmed">
                    {new Intl.NumberFormat('es-CL').format(count)} reseñas
                </Text>
            )}
        </Stack>
    );
}
