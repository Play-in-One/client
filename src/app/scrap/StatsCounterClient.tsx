'use client';

import { useEffect, useState } from 'react';
import { Group, Stack, Text } from '@mantine/core';

/* Cuenta desde 0 hasta el valor final al montar (ease-out). Respeta
   prefers-reduced-motion mostrando el valor final de una vez. */
function useCountUp(target: number, duration = 1200) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setValue(target);
            return;
        }
        let frame: number;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, duration]);

    return value;
}

function StatCounter({ value, label }: { value: number; label: string }) {
    const animated = useCountUp(value);
    return (
        <Stack gap={0} align="center">
            <Text fz={28} fw={800}>
                {animated.toLocaleString('es-CL')}+
            </Text>
            <Text fz="sm" c="dimmed">{label}</Text>
        </Stack>
    );
}

export default function StatsCounterClient({
    sellers, games, products,
}: {
    sellers: number;
    games: number;
    products: number;
}) {
    return (
        <Group justify="center" gap={40} mt="lg" mb="xl">
            <StatCounter value={sellers} label="tiendas" />
            <StatCounter value={games} label="juegos" />
            <StatCounter value={products} label="productos" />
        </Group>
    );
}
