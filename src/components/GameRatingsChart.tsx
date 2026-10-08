'use client';

import { Box, Center, Stack } from '@mantine/core';
import type { IconType } from 'react-icons';
import { SiMetacritic, SiIgdb, SiSteam } from 'react-icons/si';
import type { GameRating, GameRatingSource } from '@/lib/types';
import { normalizeRatings, averageNormalized } from '@/lib/ratings';
import RatingGauge from './RatingGauge';
import AverageIcon from './icons/AverageIcon';

interface GameRatingsChartProps {
    ratings: GameRating[];
}

const SOURCE_ICON: Record<GameRatingSource, IconType> = {
    metacritic: SiMetacritic,
    igdb: SiIgdb,
    steam: SiSteam,
};

export default function GameRatingsChart({ ratings }: GameRatingsChartProps) {
    const normalized = normalizeRatings(ratings);

    if (normalized.length === 0) return null;

    // Con más de una fuente, el promedio simple de lo que ya se muestra
    // reemplaza al badge que antes iba arriba — mismo criterio de peso que
    // `compute_game_rating` en el enricher (todas las fuentes pesan igual).
    const average = averageNormalized(normalized);

    return (
        <Stack data-testid="ratings-gauges" gap="sm">
            {average != null && (
                <Center>
                    <Box w={110}>
                        <RatingGauge
                            value={average}
                            label="Promedio"
                            icon={AverageIcon}
                            count={null}
                            testId="rating-gauge-average"
                            size={110}
                        />
                    </Box>
                </Center>
            )}
            {/* Grid basado en el ANCHO DEL CONTENEDOR (auto-fit/minmax), no en
                el viewport: los breakpoints de SimpleGrid miden la ventana, así
                que en una tarjeta angosta dentro de una ventana ancha los
                gauges se superponían en vez de apilarse. */}
            <Box
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(58px, 1fr))',
                    gap: 'var(--mantine-spacing-sm)',
                }}
            >
                {normalized.map((rating) => (
                    <RatingGauge
                        key={rating.source}
                        value={rating.normalized}
                        label={rating.sourceLabel}
                        icon={SOURCE_ICON[rating.source]}
                        count={rating.count}
                        testId={`rating-gauge-${rating.source}`}
                    />
                ))}
            </Box>
        </Stack>
    );
}
