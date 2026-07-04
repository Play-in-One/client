import type { Game, Genre, Seller, Platform, PaginatedResponse, Post } from './types';

const API_BASE = typeof window === 'undefined'
    ? (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api');

/* ── Rate-limit failed requests ── */
const failedRequestsCache = new Map<string, { error: Error; expireAt: number }>();
const FAILED_REQUEST_COOLDOWN_MS = 10_000; // 10 seconds

/* ── helpers ── */
async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
    // Check if this request failed recently and is still in cooldown
    const cached = failedRequestsCache.get(path);
    if (cached && Date.now() < cached.expireAt) {
        throw cached.error;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch { /* ignore */ }
        const error = new Error(`API ${res.status}: ${res.statusText}${body ? ` — ${body}` : ''}`);
        // Cache this failure for the cooldown period
        failedRequestsCache.set(path, {
            error,
            expireAt: Date.now() + FAILED_REQUEST_COOLDOWN_MS,
        });
        throw error;
    }
    // Clear any cached failure for this path on success
    failedRequestsCache.delete(path);
    return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | boolean | number[] | undefined>): string {
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
    condition?: string;
    price_min?: number;
    price_max?: number;
    on_sale?: boolean;
    ordering?: string;
    page?: number;
    signal?: AbortSignal;
}) {
    const { signal, ...qsParams } = params ?? {};
    return fetcher<PaginatedResponse<Game>>(`/games/${qs(qsParams)}`, { signal });
}

export async function getGame(id: number | string) {
    return fetcher<Game>(`/games/${id}/`);
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

export async function getSeller(id: number | string) {
    return fetcher<Seller>(`/sellers/${id}/`);
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
