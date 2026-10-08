import { test, expect } from '@playwright/test';
import {
    priceSummarySentences,
    historicMinSentence,
    change30Sentence,
    averageSentence,
    conditionRangeSentence,
    monthlyMinimums,
    ratingLines,
} from '../../src/lib/priceSummary';
import { normalizeRatings, averageNormalized } from '../../src/lib/ratings';
import { bestPriceSentence } from '../../src/lib/seo';
import type { Game, GameRating, PriceStats } from '../../src/lib/types';

const stats = (over: Partial<PriceStats> = {}): PriceStats => ({
    all_time_min: null,
    avg_180d: null,
    price_30d_ago: null,
    change_30d: null,
    is_all_time_low: false,
    days_since_last_change: null,
    in_stock_offers: 3,
    in_stock_sellers: 2,
    platforms_in_stock: ['ps5'],
    by_condition: {},
    ...over,
});

const game = (price_stats: PriceStats | null, over: Partial<Game> = {}): Game =>
    ({
        id: 1,
        name: 'Juego X',
        min_price: '50000',
        min_price_shipping: '0',
        min_price_seller: { id: 9, name: 'Zmart' },
        products: [],
        price_stats,
        ...over,
    }) as unknown as Game;

const MIN = {
    price: '44990.00',
    date: '2026-07-14',
    platform: 'ps5',
    seller: { id: 3, name: 'Zmart' },
};

test('first sentence is bestPriceSentence', () => {
    const g = game(stats());
    expect(priceSummarySentences(g)[0]).toBe(bestPriceSentence(g));
});

test('no price_stats -> only the best price sentence', () => {
    const g = game(null);
    expect(priceSummarySentences(g)).toEqual([bestPriceSentence(g)]);
});

test('historic min sentence with and without seller; date is not shifted by timezone', () => {
    expect(historicMinSentence(MIN)).toBe(
        'Su mínimo histórico es $44.990, registrado el 14 de julio de 2026 en Zmart (PlayStation 5).',
    );
    expect(historicMinSentence({ ...MIN, seller: null })).toBe(
        'Su mínimo histórico es $44.990, registrado el 14 de julio de 2026 (PlayStation 5).',
    );
    expect(historicMinSentence(null)).toBeNull();
});

test('all-time low vs percentage above the minimum', () => {
    const low = priceSummarySentences(game(stats({ all_time_min: MIN, is_all_time_low: true })));
    expect(low).toContain('Hoy está en su mínimo histórico.');

    // 50000 vs 44990 -> 5010 más, 11%
    const above = priceSummarySentences(game(stats({ all_time_min: MIN })));
    expect(above).toContain('Hoy está un 11% sobre ese mínimo ($5.010 más).');

    // pct 0 -> omitted
    const flat = priceSummarySentences(
        game(stats({ all_time_min: { ...MIN, price: '49999.00' } })),
    );
    expect(flat.some((s) => s.startsWith('Hoy está un'))).toBe(false);
});

test('change in 30 days: negative, positive, zero', () => {
    expect(change30Sentence({ abs: '-5000.00', pct: -10 })).toBe(
        'Bajó $5.000 (10%) respecto a hace 30 días.',
    );
    expect(change30Sentence({ abs: '2500.00', pct: 5.26 })).toBe(
        'Subió $2.500 (5,3%) respecto a hace 30 días.',
    );
    expect(change30Sentence({ abs: '0.00', pct: 0 })).toBe(
        'El precio más bajo no ha cambiado en los últimos 30 días.',
    );
    expect(change30Sentence(null)).toBeNull();
});

test('average below / above / equal', () => {
    expect(averageSentence('52310.00', '50000')).toBe(
        'El promedio de los últimos 180 días es $52.310; hoy está por debajo del promedio.',
    );
    expect(averageSentence('48000.00', '50000')).toBe(
        'El promedio de los últimos 180 días es $48.000; hoy está por encima del promedio.',
    );
    expect(averageSentence('50000.00', '50000')).toBe(
        'El promedio de los últimos 180 días es $50.000; hoy está en el promedio.',
    );
    expect(averageSentence(null, '50000')).toBeNull();
    expect(averageSentence('50000.00', null)).toBeNull();
});

test('condition ranges: min==max, missing buckets, none', () => {
    expect(
        conditionRangeSentence({
            new: { min: '44990.00', max: '59990.00', offers: 4 },
            used: { min: '35990.00', max: '35990.00', offers: 1 },
            digital: { min: '39990.00', max: '49990.00', offers: 2 },
        }),
    ).toBe(
        'Precios en stock por condición: nuevo de $44.990 a $59.990; usado $35.990; digital de $39.990 a $49.990.',
    );
    expect(
        conditionRangeSentence({ digital: { min: '39990.00', max: '49990.00', offers: 2 } }),
    ).toBe('Precios en stock por condición: digital de $39.990 a $49.990.');
    expect(conditionRangeSentence({})).toBeNull();
});

test('priceSummarySentences keeps the documented order', () => {
    const s = priceSummarySentences(
        game(
            stats({
                all_time_min: MIN,
                change_30d: { abs: '-5000.00', pct: -10 },
                avg_180d: '52310.00',
                by_condition: { new: { min: '44990.00', max: '44990.00', offers: 1 } },
            }),
        ),
    );
    expect(s).toHaveLength(6);
    expect(s[1]).toMatch(/^Su mínimo histórico/);
    expect(s[2]).toMatch(/^Hoy está un/);
    expect(s[3]).toMatch(/^Bajó/);
    expect(s[4]).toMatch(/^El promedio/);
    expect(s[5]).toBe('Precios en stock por condición: nuevo $44.990.');
});

const pt = (price: string | null, timestamp: string) => ({ price, timestamp });

test('monthlyMinimums carries the last price across months and takes the min across platforms', () => {
    const history = {
        ps5: {
            '': [
                pt('40000', '2026-09-10T15:00:00Z'),
                pt('50000', '2026-07-05T15:00:00Z'),
            ],
        },
        switch: {
            '': [pt('45000', '2026-08-20T15:00:00Z')],
        },
    };
    const out = monthlyMinimums(history, 6);
    expect(out).toEqual([
        { month: 'septiembre de 2026', price: 40000, platform: 'ps5' },
        { month: 'agosto de 2026', price: 45000, platform: 'switch' },
        { month: 'julio de 2026', price: 50000, platform: 'ps5' },
    ]);
});

test('monthlyMinimums honours months cap, ignores nulls and returns [] with < 2 months', () => {
    const history = {
        ps5: {
            '': [
                pt('40000', '2026-09-10T15:00:00Z'),
                pt(null, '2026-08-10T15:00:00Z'),
                pt('50000', '2026-07-05T15:00:00Z'),
            ],
        },
    };
    const out = monthlyMinimums(history, 2);
    expect(out.map((m) => m.month)).toEqual(['septiembre de 2026', 'agosto de 2026']);
    // out of stock midway: July has 50000 until the 10th of August
    expect(out[1].price).toBe(50000);

    expect(monthlyMinimums({ ps5: { '': [pt('40000', '2026-09-10T15:00:00Z')] } })).toEqual([]);
    expect(monthlyMinimums(undefined)).toEqual([]);
    expect(monthlyMinimums({ ps5: { new: [pt('1', '2026-09-10T15:00:00Z'), pt('1', '2026-08-10T15:00:00Z')] } })).toEqual([]);
});

const rating = (over: Partial<GameRating>): GameRating => ({
    source: 'metacritic',
    score: '83',
    scale: 100,
    count: null,
    label: 'Metacritic',
    url: '',
    fetched_at: '',
    ...over,
});

test('ratingLines formats lines and normalized average using the chart math', () => {
    const ratings = [
        rating({ source: 'igdb', score: '8.3', scale: 10, count: 1234, label: 'IGDB' }),
        rating({}),
    ];
    const lines = ratingLines(ratings);
    expect(lines).toEqual([
        'Valoración Metacritic: 83/100',
        'Valoración IGDB: 8,3/10 según 1.234 votos',
        'Promedio normalizado: 8,3/10',
    ]);
    const avg = averageNormalized(normalizeRatings(ratings))!;
    expect(avg).toBeCloseTo(8.3, 5);
});

test('ratingLines: single source has no average; empty/undefined -> []', () => {
    expect(ratingLines([rating({})])).toEqual(['Valoración Metacritic: 83/100']);
    expect(ratingLines([])).toEqual([]);
    expect(ratingLines(undefined)).toEqual([]);
    expect(ratingLines([rating({ score: '120' })])).toEqual([]);
});
