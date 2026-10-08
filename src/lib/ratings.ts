/* Normalización de valoraciones externas a escala 0-10.
 *
 * Una sola implementación para el gráfico (`GameRatingsChart`) y para el texto
 * visible (`priceSummary.ratingLines`): si el promedio que se dibuja y el que
 * se escribe usaran cuentas distintas, la página se contradiría a sí misma.
 * Puro y sin React, para poder importarlo desde Server Components.
 */
import type { GameRating, GameRatingSource } from './types';

export const RATING_SOURCES: Record<GameRatingSource, { label: string; order: number }> = {
    metacritic: { label: 'Metacritic', order: 0 },
    igdb: { label: 'IGDB', order: 1 },
    steam: { label: 'Steam', order: 2 },
};

export interface NormalizedRating extends GameRating {
    sourceLabel: string;
    normalized: number;
}

export function normalizeRatings(ratings: GameRating[]): NormalizedRating[] {
    return ratings
        .flatMap((rating) => {
            if (!(rating.source in RATING_SOURCES)) return [];
            const score = Number(rating.score);
            const scale = Number(rating.scale);
            if (!Number.isFinite(score) || !Number.isFinite(scale) || scale <= 0 || score < 0 || score > scale) {
                return [];
            }
            return [{
                ...rating,
                sourceLabel: RATING_SOURCES[rating.source].label,
                normalized: score / scale * 10,
            }];
        })
        .sort((a, b) => RATING_SOURCES[a.source].order - RATING_SOURCES[b.source].order);
}

/** Promedio simple de lo ya normalizado (todas las fuentes pesan igual, como
 *  `compute_game_rating` en el enricher). `null` con menos de dos fuentes. */
export function averageNormalized(normalized: NormalizedRating[]): number | null {
    return normalized.length > 1
        ? normalized.reduce((sum, r) => sum + r.normalized, 0) / normalized.length
        : null;
}
