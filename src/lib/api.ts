import type { Game, Genre, Seller, Platform, PaginatedResponse, Post, Contact, GameFacets, Product, PriceHistory } from './types';

const API_BASE = typeof window === 'undefined'
    ? (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api');

/* ── Admin auth token (single injection point) ──
 * Set by AdminContext on login/logout. Only present in the browser; SSR reads
 * stay anonymous (all read endpoints are public). Kept as a module-level var so
 * every request through fetcher() picks it up without threading it as an arg. */
let adminToken: string | null = null;
export function setAdminToken(token: string | null) {
    adminToken = token;
}

/* Callback que AdminContext registra para reaccionar cuando el token deja de ser
 * válido (expirado/revocado): una petición AUTENTICADA que es denegada (401/403)
 * significa que la sesión ya no sirve, así que se limpia. Un staff válido nunca
 * recibe 401/403 en una escritura, de modo que esto no desloguea por accidente. */
let onAuthError: (() => void) | null = null;
export function setOnAuthError(fn: (() => void) | null) {
    onAuthError = fn;
}

/* ── Rate-limit failed requests ── */
const failedRequestsCache = new Map<string, { error: Error; expireAt: number }>();
const FAILED_REQUEST_COOLDOWN_MS = 10_000; // 10 seconds

export class ApiError extends Error {
    status: number;
    data?: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

/* ── helpers ── */
async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
    // Mutations (POST/PUT/PATCH/DELETE) carry request-specific outcomes (e.g. validation
    // errors tied to the submitted data) — never cache/replay those by path like GETs.
    const isMutation = !!init?.method && init.method.toUpperCase() !== 'GET';

    if (!isMutation) {
        const cached = failedRequestsCache.get(path);
        if (cached && Date.now() < cached.expireAt) {
            throw cached.error;
        }
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            // Solo en mutaciones: un GET con Content-Type deja de ser "simple
            // request" y fuerza un preflight CORS (OPTIONS) por cada llamada.
            // Omitirlo en GETs anónimos evita ese round-trip extra.
            ...(isMutation ? { 'Content-Type': 'application/json' } : {}),
            ...(adminToken ? { Authorization: `Token ${adminToken}` } : {}),
            ...init?.headers,
        },
    });
    if (!res.ok) {
        // Sesión admin inválida: si habíamos adjuntado un token y nos deniegan
        // (401/403), el token expiró o fue revocado → limpiar y avisar.
        if (adminToken && (res.status === 401 || res.status === 403)) {
            adminToken = null;
            onAuthError?.();
        }
        let body = '';
        try { body = await res.text(); } catch { /* ignore */ }
        let data: unknown;
        try { data = body ? JSON.parse(body) : undefined; } catch { /* not JSON */ }
        const error = new ApiError(`API ${res.status}: ${res.statusText}${body ? ` — ${body}` : ''}`, res.status, data);
        // Only cache stable failures (404s). Transient errors (5xx, rate limits) would
        // otherwise get replayed to every other visitor hitting this path for 10s, turning
        // a momentary backend hiccup into a shared outage across unrelated requests.
        if (!isMutation && res.status === 404) {
            failedRequestsCache.set(path, {
                error,
                expireAt: Date.now() + FAILED_REQUEST_COOLDOWN_MS,
            });
        }
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

/* ── Popularity tracking (fire-and-forget) ── */
export type EventType =
    | 'game_click'
    | 'offer_click'
    | 'search'
    | 'platform_select'
    | 'game_save'
    | 'post_click'
    | 'post_view'
    | 'page_view';

interface EventPayload {
    event_type: EventType;
    game?: number;
    product?: number;
    platform?: number;
    post?: number;
    page_path?: string;
    search_query?: string;
}

// Anonymous, per-browser id (no PII) so events can be grouped by visitor.
function getSessionId(): string {
    const KEY = 'pio_session_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = (crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 64);
        localStorage.setItem(KEY, id);
    }
    return id;
}

/**
 * Records an anonymous interaction for popularity analytics. Fire-and-forget:
 * survives navigation (outbound offer clicks), never throws, never blocks the UI.
 *
 * Sends multipart/form-data (via FormData), NOT JSON. This is deliberate: the
 * frontend and API live on different origins, and `application/json` is not a
 * CORS-safelisted content type, so a cross-origin JSON body forces a preflight —
 * which navigator.sendBeacon cannot perform, silently dropping every event.
 * multipart/form-data IS safelisted, so the beacon is delivered without preflight.
 * Deliberately bypasses fetcher() to avoid its failure-cache and error propagation.
 */
export function trackEvent(payload: EventPayload): void {
    if (typeof window === 'undefined') return;
    try {
        const fd = new FormData();
        fd.append('event_type', payload.event_type);
        if (payload.game != null) fd.append('game', String(payload.game));
        if (payload.product != null) fd.append('product', String(payload.product));
        if (payload.platform != null) fd.append('platform', String(payload.platform));
        if (payload.post != null) fd.append('post', String(payload.post));
        if (payload.page_path) fd.append('page_path', payload.page_path);
        if (payload.search_query) fd.append('search_query', payload.search_query);
        fd.append('session_id', getSessionId());

        const url = `${API_BASE}/events/`;
        // sendBeacon returns false if it couldn't queue the request → fall back to fetch.
        if (navigator.sendBeacon?.(url, fd)) return;
        // No explicit Content-Type: the browser sets multipart/form-data + boundary.
        fetch(url, { method: 'POST', body: fd, keepalive: true }).catch(() => {});
    } catch { /* never break the UI for analytics */ }
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

/** Juegos con más tráfico en los últimos 7 días (con relleno por rating). */
export async function getTrendingGames(params?: { condition?: string; signal?: AbortSignal }) {
    const { signal, ...qsParams } = params ?? {};
    return fetcher<PaginatedResponse<Game>>(`/games/trending/${qs(qsParams)}`, { signal });
}

/** Juegos destacados curados a mano por el admin (orden manual). */
export async function getFeaturedGames(params?: { condition?: string; signal?: AbortSignal }) {
    const { signal, ...qsParams } = params ?? {};
    return fetcher<PaginatedResponse<Game>>(`/games/featured/${qs(qsParams)}`, { signal });
}

export async function getGameFacets(params?: {
    search?: string;
    platforms?: number[];
    genres?: number;
    seller?: number;
    condition?: string;
    price_min?: number;
    price_max?: number;
    on_sale?: boolean;
    signal?: AbortSignal;
}) {
    const { signal, ...qsParams } = params ?? {};
    return fetcher<GameFacets>(`/games/facets/${qs(qsParams)}`, { signal });
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

/* ── Contact ── */
export interface ContactPayload {
    name: string;
    email: string;
    message: string;
}

export async function submitContact(data: ContactPayload) {
    return fetcher<Contact>('/contact/', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/* ── Admin auth + edición (requieren token de staff, ver AdminContext) ── */
export interface LoginResponse {
    token: string;
    username: string;
    is_staff: boolean;
}

export async function login(username: string, password: string) {
    return fetcher<LoginResponse>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export async function logout() {
    return fetcher<void>('/auth/logout/', { method: 'POST' });
}

/** Edita campos del juego (nombre, imagen, etc.). PATCH /api/games/{id}/ */
export async function updateGame(id: number, patch: Partial<Pick<Game, 'name' | 'image' | 'description' | 'developer' | 'rating' | 'is_featured' | 'featured_order' | 'featured_description'>>) {
    return fetcher<Game>(`/games/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
    });
}

/** Edita un producto: plataforma (consola), url (link), imagen, condición o
 * reasignar a otro juego (game). PATCH /api/products/{id}/ */
export interface ProductPatch {
    title?: string;
    platform?: number;   // Platform id
    url?: string;
    image?: string;
    condition?: 'new' | 'used' | 'digital';
    game?: number;       // reasignar a otro juego
}

export async function updateProduct(id: number, patch: ProductPatch) {
    return fetcher<Product>(`/products/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
    });
}

/** Agrega un punto de precio (append-only). POST /api/products/{id}/prices/ */
export async function addProductPrice(productId: number, price: number | string) {
    return fetcher<PriceHistory>(`/products/${productId}/prices/`, {
        method: 'POST',
        body: JSON.stringify({ price }),
    });
}

export interface MergeResponse {
    target: number;
    products_moved: number;
    games_deleted: number;
}

/** Fusiona `sourceIds` dentro de `targetId`. POST /api/games/{id}/merge/ */
export async function mergeGames(targetId: number, sourceIds: number[]) {
    return fetcher<MergeResponse>(`/games/${targetId}/merge/`, {
        method: 'POST',
        body: JSON.stringify({ sources: sourceIds }),
    });
}
