'use client';

import { Box, Center, Stack } from '@mantine/core';
import type { IconBaseProps, IconType } from 'react-icons';
import { SiMetacritic, SiIgdb, SiSteam } from 'react-icons/si';
import type { GameRating, GameRatingSource } from '@/lib/types';
import RatingGauge from './RatingGauge';

interface GameRatingsChartProps {
    ratings: GameRating[];
}

interface NormalizedRating extends GameRating {
    sourceLabel: string;
    normalized: number;
}

const SOURCE_META: Record<GameRatingSource, { label: string; order: number; icon: IconType }> = {
    metacritic: { label: 'Metacritic', order: 0, icon: SiMetacritic },
    igdb: { label: 'IGDB', order: 1, icon: SiIgdb },
    steam: { label: 'Steam', order: 2, icon: SiSteam },
};

/** "x̄" (x-barra): símbolo estadístico de la media, para el gauge del
 *  promedio. No hay un ícono de marca para "promedio" en ningún set —
 *  se dibuja a mano, mismo trazo que los íconos de `react-icons`. */
function AverageIcon({ size = '1em', color = 'currentColor', title, ...rest }: IconBaseProps) {
    return (
        <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth={0}
            viewBox="0 0 24 24"
            height={size}
            width={size}
            color={color}
            {...rest}
        >
            {title && <title>{title}</title>}
            <line x1="7" y1="5" x2="17" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <text x="12" y="19" textAnchor="middle" fontSize="14" fontWeight="700" stroke="none">x</text>
        </svg>
    );
}

function normalizeRatings(ratings: GameRating[]): NormalizedRating[] {
    return ratings
        .flatMap((rating) => {
            if (!(rating.source in SOURCE_META)) return [];
            const score = Number(rating.score);
            const scale = Number(rating.scale);
            if (!Number.isFinite(score) || !Number.isFinite(scale) || scale <= 0 || score < 0 || score > scale) {
                return [];
            }
            return [{
                ...rating,
                sourceLabel: SOURCE_META[rating.source].label,
                normalized: score / scale * 10,
            }];
        })
        .sort((a, b) => SOURCE_META[a.source].order - SOURCE_META[b.source].order);
}

export default function GameRatingsChart({ ratings }: GameRatingsChartProps) {
    const normalized = normalizeRatings(ratings);

    if (normalized.length === 0) return null;

    // Con más de una fuente, el promedio simple de lo que ya se muestra
    // reemplaza al badge que antes iba arriba — mismo criterio de peso que
    // `compute_game_rating` en el enricher (todas las fuentes pesan igual).
    const average = normalized.length > 1
        ? normalized.reduce((sum, r) => sum + r.normalized, 0) / normalized.length
        : null;

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
                        icon={SOURCE_META[rating.source].icon}
                        count={rating.count}
                        testId={`rating-gauge-${rating.source}`}
                    />
                ))}
            </Box>
        </Stack>
    );
}
