/* ── TypeScript interfaces mirroring Django REST API ── */

export interface Platform {
    id: number;
    name: string;        // "ps5" | "ps4" | "ps3" | "xbox" | "switch" | "switch2" | "pc" | "wii" | "nds" | "3ds" | "wiiu"
    slug: string;
    display_name: string; // "PS5" | "PS4" | "Xbox" | "Switch" | "Switch 2" | "PC"
    game_count?: number;
}

export interface Seller {
    id: number;
    name: string;
    url: string;
    logo: string | null;
    favicon?: string;
    description?: string;  // only present on the store detail response
    addresses?: SellerAddress[]; // only present on the store detail response
    game_count?: number;
}

export interface SellerAddress {
    id: number;
    label: string;
    address: string;
}

export interface PriceHistory {
    id: number;
    product: number;
    price: string;       // Decimal comes as string from DRF
    timestamp: string;   // ISO date-time
}

/** Un punto de la serie del precio mínimo por consola.
 *  price = null marca "sin stock": el gráfico corta la línea en vez de
 *  interpolar sobre el hueco. */
export interface MinPricePoint {
    price: string | null;
    timestamp: string;
}

/** {[Platform.name]: {[condición]: puntos}}. La condición "" es la serie
 *  agregada (mínimo entre nuevo/usado/digital). Orden: del más reciente al
 *  más antiguo, igual que PriceHistory. */
export type MinPriceHistory = Record<string, Record<string, MinPricePoint[]>>;

export interface Product {
    id: number;
    title: string;
    platform: Platform;
    url: string;
    image: string | null;
    seller: Seller;
    condition: 'new' | 'used' | 'digital';
    game: number | null;
    current_price: string | null;
    rating: string | null;
    prices?: PriceHistory[];
}

export interface Genre {
    id: number;
    name: string;
    slug: string;
    game_count?: number;
}

export interface GameFacets {
    platforms: Record<number, number>;
    genres: Record<number, number>;
    sellers: Record<number, number>;
}

export interface Game {
    id: number;
    name: string;
    description: string | null;
    developer: string;
    release_date: string | null;
    platforms: Platform[];
    genres?: Genre[];
    image: string | null;
    /** true = portada fija puesta a mano; false = derivada del producto más
     *  barato (y por tanto recalculable en cliente al cambiar de filtro).
     *  Solo lo envía el detalle: la galería resuelve la portada en el servidor. */
    image_is_custom?: boolean;
    rating: string | null;
    min_price: string | null;
    /** Historial del precio mínimo por consola y condición. Solo lo envía el
     *  detalle, acotado a los últimos meses. */
    min_price_history?: MinPriceHistory;
    on_sale: boolean;
    products?: Product[];
    is_featured?: boolean;
    featured_order?: number | null;
    featured_description?: string | null;
}

export interface Post {
    id: number;
    title: string;
    category: 'news' | 'update' | 'deals' | 'community' | 'gaming';
    description: string;
    image: string;
    published_date: string;
}

export interface Contact {
    id: number;
    name: string;
    email: string;
    message: string;
    created_at: string;
}

/* ── Analítica (solo staff) ──
   Espejo de analytics/serializers.py. Todas las cifras vienen de las tablas de
   agregado diario, nunca de los eventos en crudo. */

export interface DailyTraffic {
    date: string;
    /** Únicos del día, sumando identificados y anónimos. */
    visitors: number;
    /** Subconjunto con consentimiento: los únicos de los que se sabe si vuelven. */
    visitors_known: number;
    visitors_new: number;
    visitors_returning: number;
    visits: number;
    page_views: number;
    events: number;
    bounces: number;
    bounce_rate: number;
    avg_visit_seconds: number;
    desktop_visits: number;
    mobile_visits: number;
    tablet_visits: number;
}

export interface DailyFunnel {
    date: string;
    game_clicks: number;
    game_views: number;
    offer_clicks: number;
    searches: number;
    game_saves: number;
    view_to_offer_rate: number;
}

export interface GameStat {
    game: number | null;
    name: string;
    views: number;
    clicks: number;
    offer_clicks: number;
    saves: number;
}

export interface SellerStat {
    seller: number | null;
    name: string;
    offer_clicks: number;
}

export interface SearchStat {
    query: string;
    searches: number;
    avg_results: number | null;
}

export interface RetentionCohortRow {
    cohort_week: string;
    week_offset: number;
    visitors: number;
    cohort_size: number;
    rate: number;
}

export interface AnalyticsPeriod {
    visitors: number;
    visitors_new: number;
    visits: number;
    page_views: number;
    bounces: number;
    bounce_rate: number;
    avg_visit_seconds: number;
    game_views: number;
    offer_clicks: number;
    searches: number;
    view_to_offer_rate: number;
}

export interface AnalyticsSummary {
    start: string;
    end: string;
    current: AnalyticsPeriod;
    previous: AnalyticsPeriod;
    /** `false` = el rollup no ha corrido hoy; las cifras no incluyen el día. */
    rollup_ran_today: boolean;
}

export interface TrafficReport {
    start: string;
    end: string;
    series: DailyTraffic[];
    totals: {
        visitors: number;
        visitors_new: number;
        visits: number;
        page_views: number;
        avg_visit_seconds: number;
    };
}

export interface FunnelReport {
    start: string;
    end: string;
    series: DailyFunnel[];
    totals: {
        game_clicks: number;
        game_views: number;
        offer_clicks: number;
        searches: number;
        game_saves: number;
        view_to_offer_rate: number;
    };
    top_games: GameStat[];
    top_sellers: SellerStat[];
}

export interface SearchReport {
    start: string;
    end: string;
    top_queries: SearchStat[];
    /** Lo que se buscó y no se encontró: la lista de la compra del catálogo. */
    zero_results: SearchStat[];
}

export interface ActivityCell {
    /** 0 = lunes, 6 = domingo (como `date.weekday()` de Python). */
    weekday: number;
    /** Hora local del sitio (ver `ActivityReport.timezone`), 0-23. */
    hour: number;
    events: number;
    visitors: number;
    /** Media por ocurrencia de ese día en el rango: hace comparables los días. */
    avg_events: number;
}

export interface ActivityReport {
    start: string;
    end: string;
    /** Zona en la que están expresadas las horas. Sin rotularla, un «pico a las
     *  21» no significa nada. */
    timezone: string;
    /** Siempre 7×24 celdas, incluidas las vacías. */
    matrix: ActivityCell[];
    max_events: number;
    by_hour: { hour: number; events: number }[];
    by_weekday: { weekday: number; events: number }[];
    /** `null` cuando no hay actividad: no se anuncia una hora punta inventada. */
    peak: ActivityCell | null;
}

export interface RetentionReport {
    first_cohort: string;
    cohorts: RetentionCohortRow[];
}

/* ── Paginated response wrapper ── */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
