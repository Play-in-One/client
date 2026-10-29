import type { Platform, Product } from './types';

export interface ConsoleGame {
    title: string;
    format: 'physical' | 'code' | 'preinstalled' | 'unknown';
    game: number | null;
}

export interface ConsoleConfiguration {
    id: number;
    console: number;
    edition: number;
    edition_name: string;
    storage_gb: number;
    storage_label: string;
    games: ConsoleGame[];
}

export interface ConsoleModel {
    id: number;
    name: string;
    slug: string;
    platform: Platform;
    image: string;
    description: string;
    min_price: string | null;
    seller_count: number;
    in_stock: boolean;
}

export interface ConsoleDetail extends ConsoleModel {
    configurations: ConsoleConfiguration[];
    products: Product[];
}

export interface ConsoleQuery {
    search?: string;
    platform?: string;
    model?: number;
    edition?: number;
    storage_gb?: number;
    configuration?: number;
    game?: number;
    has_game?: boolean;
    seller?: number;
    condition?: 'new' | 'used';
    seller_locations?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
}

export const CONSOLE_PLATFORMS = [
    ['xboxone', 'Xbox One'], ['xboxseries', 'Xbox Series'], ['ps4', 'PlayStation 4'],
    ['ps5', 'PlayStation 5'], ['switch', 'Nintendo Switch'], ['switch2', 'Nintendo Switch 2'],
] as const;

export const GAME_FORMATS: Record<ConsoleGame['format'], string> = {
    physical: 'Físico', code: 'Código', preinstalled: 'Preinstalado', unknown: 'Formato sin especificar',
};

export function consolePath(console: Pick<ConsoleModel, 'id' | 'slug'>): string {
    return `/consola/${console.slug}-${console.id}`;
}

export function configurationLabel(configuration: ConsoleConfiguration): string {
    const games = configuration.games.length ? configuration.games.map(game => game.title).join(' + ') : 'Sin juego';
    return `${configuration.edition_name} · ${configuration.storage_label} · ${games}`;
}

export function consoleQuery(params: Record<string, string | string[] | undefined>): ConsoleQuery {
    const query: Record<string, string | number | boolean> = {};
    for (const field of ['search', 'platform', 'ordering', 'seller_locations'] as const) {
        if (typeof params[field] === 'string' && params[field]) query[field] = params[field];
    }
    for (const field of ['model', 'edition', 'storage_gb', 'configuration', 'game', 'seller', 'page'] as const) {
        const value = params[field];
        if (typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))) query[field] = Number(value);
    }
    if (params.has_game === 'true' || params.has_game === 'false') query.has_game = params.has_game === 'true';
    if (params.condition === 'new' || params.condition === 'used') query.condition = params.condition;
    return query;
}

export function consoleQueryString(query: ConsoleQuery): string {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const encoded = params.toString();
    return encoded ? `?${encoded}` : '';
}
