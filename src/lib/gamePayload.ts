import type { Game, Platform, Product, Seller } from './types';
import { isAffiliateOffer } from './types';

type OfferPayload = Omit<Product, 'url' | 'affiliate_url' | 'platform' | 'seller'> & {
    platform_id: number; seller_id: number;
};
export interface GamePayload {
    version: 1;
    game: Omit<Game, 'products' | 'min_price_history' | 'min_price_history_national'>;
    offers: OfferPayload[];
    sellers: Record<number, Omit<Seller, 'url'>>;
}

/** Only this wire representation crosses the server/client boundary. */
export function packGame(game: Game): GamePayload {
    const { products = [], min_price_history, min_price_history_national, ...metadata } = game;
    void min_price_history; void min_price_history_national;
    const sellers: GamePayload['sellers'] = {};
    const platforms = new Map(metadata.platforms.map((platform) => [platform.id, platform]));
    for (const product of products) platforms.set(product.platform.id, product.platform);
    const offers = products.map((p) => {
        const { url, affiliate_url, platform, seller, ...offer } = p;
        void url; void affiliate_url;
        const { url: sellerUrl, ...publicSeller } = seller;
        void sellerUrl;
        sellers[seller.id] = publicSeller;
        return { ...offer, platform_id: platform.id, seller_id: seller.id, is_affiliate: isAffiliateOffer(p) };
    });
    return { version: 1, game: { ...metadata, platforms: [...platforms.values()], history_deferred: true }, offers, sellers };
}

/** Public display model. Editors must fetch the complete authenticated product. */
export function unpackGame(payload: GamePayload | Game): Game {
    if (!('version' in payload)) return payload;
    const platforms = new Map(payload.game.platforms.map((p) => [p.id, p]));
    return { ...payload.game, products: payload.offers.map(({ platform_id, seller_id, ...p }) => ({
        ...p, url: '', affiliate_url: '', platform: platforms.get(platform_id)!,
        seller: { ...payload.sellers[seller_id], url: '' },
    })) };
}

export interface GamesPayload {
    version: 1;
    platforms: Record<number, Platform>;
    games: (Omit<Game, 'platforms'> & { platform_ids: number[] })[];
}
export function packGames(games: Game[]): GamesPayload {
    const platforms: Record<number, Platform> = {};
    return { version: 1, platforms, games: games.map(({ platforms: list, ...g }) => {
        for (const platform of list) platforms[platform.id] = platform;
        return { ...g, platform_ids: list.map((p) => p.id) };
    }) };
}
export function unpackGames(payload: GamesPayload | Game[]): Game[] {
    if (Array.isArray(payload)) return payload;
    return payload.games.map(({ platform_ids, ...g }) => ({ ...g, platforms: platform_ids.map((id) => payload.platforms[id]) }));
}
