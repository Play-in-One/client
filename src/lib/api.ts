import type { Game, Product, Platform, PaginatedResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/* ── helpers ── */
async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined);
    if (!entries.length) return '';
    return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/* ── Games ── */
export async function getGames(params?: {
    search?: string;
    platforms?: number;
    ordering?: string;
    page?: number;
}) {
    return fetcher<PaginatedResponse<Game>>(`/games/${qs(params ?? {})}`);
}

export async function getGame(id: number | string) {
    return fetcher<Game>(`/games/${id}/`);
}

/* ── Products ── */
export async function getProducts(params?: {
    game?: number;
    platform?: number;
    seller?: number;
    condition?: string;
    search?: string;
    page?: number;
}) {
    return fetcher<PaginatedResponse<Product>>(`/products/${qs(params ?? {})}`);
}

export async function getProduct(id: number | string) {
    return fetcher<Product>(`/products/${id}/`);
}

export async function getProductPrices(productId: number | string) {
    return fetcher<PaginatedResponse<import('./types').PriceHistory>>(
        `/products/${productId}/prices/`
    );
}

/* ── Platforms ── */
export async function getPlatforms() {
    return fetcher<PaginatedResponse<Platform>>('/platforms/');
}
