import type { Game, Genre, Product, Seller, Platform, PaginatedResponse, Post } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

/* ── helpers ── */
async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | number[] | undefined>): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) {
            v.forEach((val) => usp.append(k, String(val)));
        } else {
            usp.set(k, String(v));
        }
    }
    const s = usp.toString();
    return s ? `?${s}` : '';
}

/* ── Games ── */
export async function getGames(params?: {
    search?: string;
    platforms?: number[];
    genres?: number;
    seller?: number;
    price_min?: number;
    price_max?: number;
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

/* ── Genres ── */
export async function getGenres() {
    return fetcher<PaginatedResponse<Genre>>('/genres/');
}

/* ── Sellers ── */
export async function getSellers() {
    return fetcher<PaginatedResponse<Seller>>('/sellers/');
}

/* ── Posts ── */
export async function getPosts(params?: {
    category?: string;
    search?: string;
    ordering?: string;
    page?: number;
}) {
    return fetcher<PaginatedResponse<Post>>(`/posts/${qs(params ?? {})}`);
}

export async function getPost(id: number | string) {
    return fetcher<Post>(`/posts/${id}/`);
}
