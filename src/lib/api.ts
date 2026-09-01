import type {
    Game, Genre, Seller, Platform, PaginatedResponse, Post, Contact, GameFacets, Product, PriceHistory,
    AnalyticsSummary, TrafficReport, FunnelReport, SearchReport, RetentionReport, ActivityReport,
} from './types';

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
async function fetcher<T>(path: string, init?: RequestInit & { admin?: boolean }): Promise<T> {
    // Mutations (POST/PUT/PATCH/DELETE) carry request-specific outcomes (e.g. validation
    // errors tied to the submitted data) — never cache/replay those by path like GETs.
    const isMutation = !!init?.method && init.method.toUpperCase() !== 'GET';
    const { admin, ...requestInit } = init ?? {};

    if (!isMutation) {
        const cached = failedRequestsCache.get(path);
        if (cached && Date.now() < cached.expireAt) {
            throw cached.error;
        }
    }

    // El backend usa "¿el request está autenticado como staff?" para decidir si
    // muestra catálogo oculto (juegos sin productos visibles) en list/trending/
    // featured/facets. Adjuntar el token siempre —incluso en GETs públicos—
    // filtraba ese catálogo oculto a cualquier visitante con sesión admin
    // abierta en el buscador normal. Las mutaciones SIEMPRE lo llevan (las
    // requiere el permiso de escritura); un GET solo lo lleva si el llamador
    // pide explícitamente `admin: true` (p. ej. el buscador de duplicados al
    // fusionar juegos, que sí necesita ver ocultos).
    const attachToken = isMutation || admin;

    const res = await fetch(`${API_BASE}${path}`, {
        ...requestInit,
        headers: {
            // Solo en mutaciones: un GET con Content-Type deja de ser "simple
            // request" y fuerza un preflight CORS (OPTIONS) por cada llamada.
            // Omitirlo en GETs anónimos evita ese round-trip extra.
            ...(isMutation ? { 'Content-Type': 'application/json' } : {}),
            ...(attachToken && adminToken ? { Authorization: `Token ${adminToken}` } : {}),
            ...requestInit.headers,
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
    | 'game_view'
    | 'offer_click'
    | 'search'
    | 'platform_select'
    | 'game_save'
    | 'post_click'
    | 'post_view'
    | 'page_view'
    | 'store_view'
    | 'store_click'
    | 'social_click';

/** Las redes del footer. Espejo de `Event.SocialNetwork` en el backend, que
    rechaza cualquier valor fuera de esta lista. */
export type SocialNetwork =
    | 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'youtube'
    | 'reddit' | 'tiktok' | 'pinterest' | 'gmail' | 'discord'
    | 'spotify' | 'whatsapp' | 'threads' | 'tumblr' | 'telegram';

interface EventPayload {
    event_type: EventType;
    game?: number;
    product?: number;
    platform?: number;
    post?: number;
    seller?: number;
    /** Solo en `social_click`: la clave de `siteConfig.social`. */
    social_network?: SocialNetwork;
    page_path?: string;
    search_query?: string;
    result_count?: number;
}

/* Identidad del visitante y permiso para medir, ambos inyectados por
   ConsentContext al montar y en cada cambio de preferencia.

   El identificador ya no lo genera el navegador: lo emite y lo firma el
   servidor (src/app/api/consent/route.ts) y solo existe si la persona aceptó
   la cookie de analítica. Sin él, el backend agrupa el evento bajo un hash
   diario que no se guarda en el dispositivo y no permite seguir a nadie de un
   día para otro. */
let visitorToken: string | null = null;
/* Arranca apagado a proposito. Con el valor permisivo, cualquier tracker que
   se dispare antes del primer efecto de `ConsentProvider` emitia el evento sin
   token y saltandose el opt-out: React corre los efectos de los hijos antes que
   los del padre, asi que la ventana existe en toda carga en frio. Los trackers
   esperan a `ready` del contexto; esto es el cinturon por si alguno se olvida. */
let measurementEnabled = false;

export function setVisitorToken(token: string | null): void {
    visitorToken = token;
}

/** `false` = opt-out total desde /cookies: no se envía ni un evento anónimo. */
export function setMeasurementEnabled(enabled: boolean): void {
    measurementEnabled = enabled;
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
    if (typeof window === 'undefined' || !measurementEnabled) return;
    try {
        const fd = new FormData();
        fd.append('event_type', payload.event_type);
        if (payload.game != null) fd.append('game', String(payload.game));
        if (payload.product != null) fd.append('product', String(payload.product));
        if (payload.platform != null) fd.append('platform', String(payload.platform));
        if (payload.post != null) fd.append('post', String(payload.post));
        if (payload.seller != null) fd.append('seller', String(payload.seller));
        if (payload.social_network) fd.append('social_network', payload.social_network);
        if (payload.page_path) fd.append('page_path', payload.page_path);
        if (payload.search_query) fd.append('search_query', payload.search_query);
        if (payload.result_count != null) fd.append('result_count', String(payload.result_count));
        if (visitorToken) fd.append('visitor_id', visitorToken);

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
    /** 'national' | 'international': acota a juegos con oferta en tiendas de ese tipo. */
    seller_scope?: string;
    ordering?: string;
    page?: number;
    signal?: AbortSignal;
    /** Solo para herramientas de admin (buscador de duplicados al fusionar):
     * incluye juegos sin productos visibles, ocultos al público. */
    admin?: boolean;
}) {
    const { signal, admin, ...qsParams } = params ?? {};
    return fetcher<PaginatedResponse<Game>>(`/games/${qs(qsParams)}`, { signal, admin });
}

/** Juegos con más tráfico en los últimos 7 días (con relleno por rating). */
export async function getTrendingGames(params?: {
    condition?: string;
    seller_scope?: string;
    signal?: AbortSignal;
}) {
    const { signal, ...qsParams } = params ?? {};
    return fetcher<PaginatedResponse<Game>>(`/games/trending/${qs(qsParams)}`, { signal });
}

/** Juegos destacados curados a mano por el admin (orden manual). */
export async function getFeaturedGames(params?: {
    condition?: string;
    seller_scope?: string;
    signal?: AbortSignal;
}) {
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
    /** 'national' | 'international': acota a juegos con oferta en tiendas de ese tipo. */
    seller_scope?: string;
    signal?: AbortSignal;
}) {
    const { signal, ...qsParams } = params ?? {};
    return fetcher<GameFacets>(`/games/facets/${qs(qsParams)}`, { signal });
}

export async function getGame(id: number | string) {
    return fetcher<Game>(`/games/${id}/`);
}

/** Entrada del catálogo indexable: lo mínimo que necesita un `<url>` del sitemap. */
export interface GameSitemapEntry {
    id: number;
    /** Ausente si el juego todavía no tiene serie de precios. */
    lastmod?: string;
}

/**
 * El catálogo indexable entero en UNA petición, para `app/sitemap.ts`.
 *
 * No es `getGames()` con un page_size grande: la API pagina de a 24 y no acepta
 * `page_size`, así que recorrerla eran ~410 peticiones que además pagaban las
 * subconsultas de precio para usar solo el id. El endpoint devuelve id + fecha
 * y nada más.
 */
export async function getGamesForSitemap() {
    return fetcher<{ results: GameSitemapEntry[] }>('/games/sitemap/');
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
// `page` existe para que el sitemap pueda recorrer las 76 tiendas: sin él se
// quedaba en la primera página de 24 y publicaba un tercio de las fichas.
export async function getSellers(params?: { page?: number }) {
    return fetcher<PaginatedResponse<Seller>>(`/sellers/${qs(params ?? {})}`);
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

/* ── Analítica (solo staff) ──
   Todas pasan `admin: true` para que fetcher adjunte el token también en GET:
   los endpoints exigen is_staff y sin él responden 403. */

export async function getAnalyticsSummary(days = 30) {
    return fetcher<AnalyticsSummary>(`/analytics/summary/?days=${days}`, { admin: true });
}

export async function getAnalyticsTraffic(days = 30) {
    return fetcher<TrafficReport>(`/analytics/traffic/?days=${days}`, { admin: true });
}

export async function getAnalyticsFunnel(days = 30, top = 10) {
    return fetcher<FunnelReport>(`/analytics/funnel/?days=${days}&top=${top}`, { admin: true });
}

export async function getAnalyticsSearch(days = 30, top = 20) {
    return fetcher<SearchReport>(`/analytics/search/?days=${days}&top=${top}`, { admin: true });
}

export async function getAnalyticsRetention(weeks = 12) {
    return fetcher<RetentionReport>(`/analytics/retention/?weeks=${weeks}`, { admin: true });
}

export async function getAnalyticsActivity(days = 30) {
    return fetcher<ActivityReport>(`/analytics/activity/?days=${days}`, { admin: true });
}
