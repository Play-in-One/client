import { test, expect } from '@playwright/test';
import { buildGameFaq } from '../../src/lib/gameFaq';
import { change30Sentence, averageSentence } from '../../src/lib/priceSummary';
import type { Game, PriceStats } from '../../src/lib/types';

const platform = (slug: string, long: string) => ({ id: 1, slug, name: slug, display_name: slug, long_name: long });
const product = (id: number, price: string, condition: string, seller: string, slug = 'ps5') => ({
    id,
    current_price: price,
    condition,
    in_stock: true,
    seller: { id: id, name: seller },
    platform: platform(slug, slug === 'ps5' ? 'PlayStation 5' : 'Nintendo Switch'),
});

const stats = (over: Partial<PriceStats> = {}): PriceStats => ({
    all_time_min: null,
    avg_180d: null,
    price_30d_ago: null,
    change_30d: null,
    is_all_time_low: false,
    days_since_last_change: null,
    in_stock_offers: 1,
    in_stock_sellers: 1,
    platforms_in_stock: [],
    by_condition: {},
    ...over,
});

const game = (over: Partial<Game> = {}): Game =>
    ({
        id: 1,
        name: 'Juego X',
        min_price: '50000',
        min_price_shipping: '0',
        min_price_seller: { id: 9, name: 'Zmart' },
        products: [product(1, '50000', 'new', 'Zmart'), product(2, '40000', 'used', 'Otra')],
        ...over,
    }) as unknown as Game;

const q = (entries: { question: string; answer: string }[], text: string) =>
    entries.find((e) => e.question.includes(text));

test('historicLow prefers price_stats.all_time_min with date and seller', () => {
    const g = game({
        price_stats: stats({
            all_time_min: {
                price: '44990.00', date: '2026-07-14', platform: 'ps5',
                seller: { id: 3, name: 'Tienda Y' },
            },
        }),
        // la serie diría otro mínimo: no debe usarse
        min_price_history: { ps5: { '': [{ price: '1000', timestamp: '2026-01-01T12:00:00Z' }] } },
    });
    const a = q(buildGameFaq(g), 'precio más bajo')!.answer;
    expect(a).toBe(
        'El precio más bajo registrado para Juego X es $44.990, el 14 de julio de 2026 en Tienda Y. ' +
        'Hoy está en $50.000, $5.010 (11%) por sobre ese mínimo.',
    );
});

test('historicLow falls back to the series scan without date/seller', () => {
    const g = game({
        min_price_history: { ps5: { '': [{ price: '45000', timestamp: '2026-01-01T12:00:00Z' }] } },
    });
    expect(q(buildGameFaq(g), 'precio más bajo')!.answer).toBe(
        'El precio más bajo registrado para Juego X es $45.000. ' +
        'Hoy está en $50.000, $5.000 (11%) por sobre ese mínimo.',
    );
});

test('at the low the answer is unchanged', () => {
    const g = game({
        min_price: '44990',
        price_stats: stats({
            all_time_min: { price: '44990.00', date: '2026-07-14', platform: 'ps5', seller: null },
        }),
    });
    expect(q(buildGameFaq(g), 'precio más bajo')!.answer).toBe(
        'Sí. $44.990 es el precio más bajo que ha tenido Juego X desde que PIO lo sigue.',
    );
});

test('new entries reuse the summary sentences and omit without data', () => {
    const change = { abs: '-5000.00', pct: -10 };
    const g = game({ price_stats: stats({ change_30d: change, avg_180d: '52310.00' }) });
    const faq = buildGameFaq(g);
    expect(q(faq, 'en el último mes')!.answer).toBe(change30Sentence(g.price_stats));
    expect(q(faq, 'en promedio')!.answer).toBe(averageSentence('52310.00', '50000'));

    const plain = buildGameFaq(game({ price_stats: stats() }));
    expect(q(plain, 'en el último mes')).toBeUndefined();
    expect(q(plain, 'en promedio')).toBeUndefined();
});

test('change in 30 days at zero depends on days_since_last_change', () => {
    const zero = { abs: '0.00', pct: 0 };
    const recent = buildGameFaq(game({ price_stats: stats({ change_30d: zero, days_since_last_change: 4 }) }));
    expect(q(recent, 'en el último mes')!.answer).toBe('Está al mismo precio que hace 30 días.');
    const stale = buildGameFaq(game({ price_stats: stats({ change_30d: zero, days_since_last_change: 45 }) }));
    expect(q(stale, 'en el último mes')!.answer).toBe(
        'El precio más bajo no ha cambiado en los últimos 30 días.',
    );
});

test('distance to the low omits the percentage when it rounds to 0%', () => {
    const g = game({
        min_price: '50000',
        price_stats: stats({
            all_time_min: { price: '49900.00', date: '2026-07-14', platform: 'ps5', seller: null },
        }),
    });
    expect(q(buildGameFaq(g), 'precio más bajo')!.answer).toBe(
        'El precio más bajo registrado para Juego X es $49.900, el 14 de julio de 2026. ' +
        'Hoy está en $50.000, $100 por sobre ese mínimo.',
    );
});

test('FAQ caps at 6 and the platforms question is what yields', () => {
    const g = game({
        price_stats: stats({
            all_time_min: { price: '44990.00', date: '2026-07-14', platform: 'ps5', seller: null },
            change_30d: { abs: '-5000.00', pct: -10 },
            avg_180d: '52310.00',
        }),
    });
    const faq = buildGameFaq(g);
    expect(faq).toHaveLength(6);
    expect(q(faq, 'consolas')).toBeUndefined();
    expect(q(faq, 'en promedio')).toBeDefined();
});
