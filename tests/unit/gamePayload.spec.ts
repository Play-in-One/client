import { test, expect } from '@playwright/test';
import { packGame, unpackGame, packGames, unpackGames } from '../../src/lib/gamePayload';
import { isAffiliateOffer, type Game, type Product } from '../../src/lib/types';

const platform = { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5' };
const seller = { id: 1, name: 'Tienda', url: 'https://shop.invalid', logo: null, location: 'CL-BI',
    is_international: false, has_agreement: true, coupon_code: 'PIO', coupon_discount_percent: 5, shipping_cost: '3000' };
const offer = { id: 1, platform, seller, url: 'https://shop.invalid/offer', affiliate_url: 'https://affiliate.invalid',
    title: 'Oferta', condition: 'new', game: 1, image: null, current_price: '12500', base_price: '10000', shipping_cost: '3000',
    rating: null, in_stock: true } as Product;
const game = { id: 1, name: 'Juego', slug: 'juego', platforms: [platform], products: [offer, { ...offer, id: 2, in_stock: false }],
    min_price_history: { ps5: { '': [{ price: '10000', timestamp: '2026-11-01' }] } },
    min_price_history_national: {}, min_price: '12500' } as unknown as Game;

test('public payload preserves stock, regional filtering and coupon/affiliate semantics without URLs or histories', () => {
    const wire = packGame(game);
    expect(Object.keys(wire.sellers)).toHaveLength(1);
    expect(JSON.stringify(wire)).not.toContain('https://');
    expect(JSON.stringify(wire)).not.toContain('min_price_history');
    const restored = unpackGame(wire);
    expect(restored.history_deferred).toBe(true);
    expect(restored.products!.map(p => p.in_stock)).toEqual([true, false]);
    for (const p of restored.products!) {
        expect(p.seller.location).toBe('CL-BI');
        expect(p.seller.coupon_code).toBe('PIO');
        expect(p.current_price).toBe('12500');
        expect(isAffiliateOffer(p)).toBe(true);
        expect(p.url).toBe('');
    }
    expect(game.products![0].url).toBe('https://shop.invalid/offer');
});

test('gallery dictionary round trips platform IDs and metadata without mutating API results', () => {
    const games = [game, { ...game, id: 2 }];
    const wire = packGames(games);
    expect(Object.keys(wire.platforms)).toHaveLength(1);
    expect(unpackGames(wire)).toEqual(games);
});
