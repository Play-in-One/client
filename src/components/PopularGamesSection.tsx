'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Anchor,
    Box,
    Container,
    Group,
    SimpleGrid,
    Skeleton,
    Text,
    Title,
} from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';

import GameCard from '@/components/GameCard';
import { useApp } from '@/context/AppContext';
import { getPopularGames } from '@/lib/api';
import { sampleBy, POPULAR_SAMPLE_SIZE } from '@/lib/utils';
import type { Game } from '@/lib/types';

function SampleSkeleton() {
    return (
        <SimpleGrid cols={{ base: 2, xs: 2, md: 4 }} spacing={{ base: 'xs', xs: 'lg' }}>
            {Array.from({ length: POPULAR_SAMPLE_SIZE }).map((_, i) => (
                <Box key={i}>
                    <Skeleton radius="lg" style={{ aspectRatio: '3/4' }} />
                    <Skeleton height={12} mt="sm" width="80%" />
                    <Skeleton height={12} mt={6} width="50%" />
                </Box>
            ))}
        </SimpleGrid>
    );
}

/**
 * Cuatro juegos al azar del top 40 por tráfico, al fondo de la ficha.
 *
 * El muestreo ya viene hecho desde el servidor (`initialGames`), así que el
 * primer render es el definitivo y no hay hydration mismatch: `Math.random()`
 * corre una sola vez, en el servidor.
 *
 * Solo se vuelve a pedir cuando los filtros globales se desvían del default. El
 * pool del SSR sale del Data Cache de Next, que se comparte entre todas las
 * fichas y por tanto NO puede venir filtrado — mismo trato que "Populares" en
 * la home, incluido el `data-prefs-dependent` que tapa el hueco hasta que llega
 * el refetch.
 */
export default function PopularGamesSection({
    initialGames,
    excludeId,
}: {
    initialGames: Game[];
    excludeId: number;
}) {
    const { conditionParam, sellerScopeParam, ready } = useApp();
    const [games, setGames] = useState<Game[]>(initialGames);
    const [filtering, setFiltering] = useState(false);

    useEffect(() => {
        // Sin las preferencias leídas, los params valen su default optimista:
        // pedir con ellos gasta un fetch que hay que repetir.
        if (!ready) return;
        // Sobre los params DERIVADOS, no sobre `condition`: con formato "físico"
        // y estado "todos" la condición sigue siendo 'all' pero el filtro acota.
        if (!conditionParam && !sellerScopeParam) {
            setGames(initialGames);
            setFiltering(false);
            return;
        }

        const controller = new AbortController();
        let superseded = false;
        setFiltering(true);
        getPopularGames({
            condition: conditionParam,
            seller_scope: sellerScopeParam,
            signal: controller.signal,
        })
            .then((res) => {
                if (superseded) return;
                setGames(sampleBy(res.results, POPULAR_SAMPLE_SIZE, excludeId));
                setFiltering(false);
            })
            .catch(() => {
                if (superseded) return;
                setGames([]);
                setFiltering(false);
            });

        return () => {
            superseded = true;
            controller.abort();
        };
    }, [ready, conditionParam, sellerScopeParam, initialGames, excludeId]);

    if (games.length === 0 && !filtering) return null;

    return (
        <Box pb={60}>
            {/* 'lg' como el Container de GameDetailClient y el de FaqSection: con
                otro tamaño la sección se sale por un lado del resto de la ficha. */}
            <Container size="lg">
                <Group justify="space-between" align="flex-end" mb="xl">
                    <Box>
                        <Title order={2} fz={{ base: 22, md: 28 }} fw={700}>
                            Otros juegos populares
                        </Title>
                        <Text c="dimmed" mt={6} fz="sm">
                            Una selección al azar entre los más vistos del catálogo.
                        </Text>
                    </Box>
                    <Anchor
                        component={Link}
                        href="/search"
                        c="var(--mantine-color-primaryRed-5)"
                        fw={600}
                        fz="sm"
                        underline="never"
                    >
                        Ver todos los juegos <IconArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                    </Anchor>
                </Group>

                <Box data-prefs-dependent>
                    {filtering ? (
                        <SampleSkeleton />
                    ) : (
                        <SimpleGrid cols={{ base: 2, xs: 2, md: 4 }} spacing={{ base: 'xs', xs: 'lg' }}>
                            {games.map((g) => (
                                <GameCard key={g.id} game={g} />
                            ))}
                        </SimpleGrid>
                    )}
                </Box>
            </Container>
        </Box>
    );
}
