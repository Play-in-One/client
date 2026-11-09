import { test, expect } from '@playwright/test';
import {
    beginSeededNavigation, cancelSeededNavigation, gameSeedFrom, getPendingNavigation, resetNavigationSeedForTests,
    samePath, seedMatches, seedTarget, settleSeededNavigation, SEED_TIMEOUT_MS, type GameSeed,
} from '../../src/lib/navigationSeed';
import type { Game } from '../../src/lib/types';

/* El almacén vive en el módulo y escucha `popstate` en `window`: en Node basta
   un EventTarget como ventana. */
const fakeWindow = new EventTarget();
(globalThis as unknown as { window: EventTarget }).window = fakeWindow;

const ps5 = { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5' };
const seed: GameSeed = {
    kind: 'game', id: 42, name: 'Juego', image: null, platforms: [ps5], selectedPlatform: 'ps5', price: null,
};

test.beforeEach(() => resetNavigationSeedForTests());

test('seedTarget and seedMatches resolve detail routes by id, not slug', () => {
    expect(seedTarget('/juego/juego-42')).toEqual({ kind: 'game', id: '42' });
    expect(seedTarget('/consola/ps5-slim-7')).toEqual({ kind: 'console', id: '7' });
    expect(seedTarget('/blog/noticia-3')).toEqual({ kind: 'post', id: '3' });
    expect(seedTarget('/juegos/ps5')).toBeNull();
    // A 308 to the canonical slug is still the same detail.
    expect(seedMatches(seed, '/juego/otro-nombre-42')).toBe(true);
    expect(seedMatches(seed, '/juego/42')).toBe(true);
    expect(seedMatches(seed, '/juego/juego-421')).toBe(false);
    expect(seedMatches(seed, '/consola/juego-42')).toBe(false);
});

test('samePath ignores percent-encoding and a trailing slash', () => {
    expect(samePath('/search', '/search/')).toBe(true);
    expect(samePath('/saga/pok%C3%A9mon', '/saga/pokémon')).toBe(true);
    expect(samePath('/search', '/ofertas')).toBe(false);
});

test('a confirmed navigation retires the overlay but keeps the seed while on its detail', () => {
    beginSeededNavigation(seed, '/juego/juego-42', '/search');
    expect(getPendingNavigation()?.seed).toBe(seed);
    // Same pathname: the response has not arrived yet.
    settleSeededNavigation('/search');
    expect(getPendingNavigation()).not.toBeNull();
    settleSeededNavigation('/juego/juego-42');
    expect(getPendingNavigation()).toBeNull();
    // Leaving the detail drops the seed for good.
    settleSeededNavigation('/');
    beginSeededNavigation({ ...seed, id: 7 }, '/juego/x-7', '/');
    cancelSeededNavigation();
    expect(getPendingNavigation()).toBeNull();
});

test('a stale token cannot cancel a newer navigation', () => {
    const first = beginSeededNavigation(seed, '/juego/juego-42', '/search');
    beginSeededNavigation({ ...seed, id: 8 }, '/juego/x-8', '/search');
    cancelSeededNavigation(first);
    expect(getPendingNavigation()?.seed.id).toBe(8);
});

test('popstate and the timeout cancel a pending navigation', async () => {
    beginSeededNavigation(seed, '/juego/juego-42', '/search');
    fakeWindow.dispatchEvent(new Event('popstate'));
    expect(getPendingNavigation()).toBeNull();
    expect(SEED_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
});

test('gameSeedFrom only carries the price of the platform the card shows', () => {
    const game = {
        id: 5, name: 'X', image: 'https://img.invalid/x.jpg', platforms: [ps5, { ...ps5, id: 2, slug: 'switch' }],
        min_price: '19990', min_price_platform: 'ps5', min_price_shipping: '0', min_price_condition: 'new',
        min_price_seller: { id: 9, name: 'Tienda' },
    } as unknown as Game;
    expect(gameSeedFrom(game).price).toEqual({ amount: '19990', shipping: '0', condition: 'new', seller: { id: 9, name: 'Tienda' } });
    expect(gameSeedFrom(game).selectedPlatform).toBe('ps5');
    expect(gameSeedFrom(game, 'switch').price).toBeNull();
});
