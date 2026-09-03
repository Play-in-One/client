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
    /** Tienda internacional (importación). Solo informativo y para filtrar:
     *  no decide si se cobra envío, eso lo dice shipping_cost. */
    is_international: boolean;
    /** Envío promedio que se suma al precio de lista de sus productos.
     *  "0.00" = envío gratis o incluido. */
    shipping_cost: string;
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
    /** Precio EFECTIVO: lista + envío de la tienda. Es el que se muestra, se
     *  ordena y se compara en toda la plataforma. */
    current_price: string | null;
    /** Precio de lista, sin envío. Solo para el desglose del ícono de info. */
    base_price: string | null;
    /** Envío que aporta esta oferta. "0.00" en digitales y en tiendas sin
     *  despacho; null cuando la oferta no tiene precio. */
    shipping_cost: string | null;
    rating: string | null;
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
    /** Trozo legible de la URL de la ficha (`/juego/<slug>-<id>`). Lo deriva el
     *  backend del nombre; el id sigue mandando y un slug viejo redirige. */
    slug: string;
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
    /** Precio EFECTIVO de la mejor oferta: lista + envío de su tienda. */
    min_price: string | null;
    /** Desglose de min_price. Viaja en la galería porque la tarjeta se
     *  renderiza sin los productos del juego: sin esto no tendría cómo saber
     *  que la cifra lleva despacho incluido. */
    min_price_base: string | null;
    min_price_shipping: string | null;
    /** Tienda que tiene esa mejor oferta. Sale del MISMO producto que fija
     *  min_price, así que el precio y el "dónde se consigue" no pueden
     *  discrepar. null cuando el juego no tiene ninguna oferta con precio. */
    min_price_seller?: { id: number; name: string } | null;
    /** Cuándo se registró por última vez ese precio. Es la señal de frescura:
     *  alimenta el priceValidUntil del dato estructurado y el "precio
     *  actualizado el …" que se muestra y se cita. */
    price_updated_at?: string | null;
    /** Historial del precio mínimo por consola y condición. Solo lo envía el
     *  detalle, acotado a los últimos meses. */
    min_price_history?: MinPriceHistory;
    /** La misma serie excluyendo las tiendas internacionales. Viene vacía
     *  cuando el juego no tiene ninguna oferta importada: ahí sería idéntica a
     *  la agregada y el backend no la guarda. */
    min_price_history_national?: MinPriceHistory;
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
    /**
     * Navegadores distintos ese día. NO son personas: agrupa por sesión, así
     * que el mismo humano en el móvil y en el escritorio cuenta dos veces, y
     * quien navega sin aceptar la cookie solo se distingue por IP + navegador.
     */
    sessions: number;
    /** Los que sí aceptaron la cookie: personas, y se sabe si vuelven. */
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
    sessions: number;
    visitors_known: number;
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
    /** Siempre `true`: el backend reagrega el día en curso al servir el panel. */
    rollup_ran_today: boolean;
    /**
     * Qué % de la audiencia cubren las métricas de comportamiento. `visits`,
     * rebote, duración, dispositivo y retención solo existen para quien aceptó
     * la cookie; el resto de cifras cubre a todo el mundo. Sin esto el panel
     * ponía un rebote calculado sobre un cuarto de la gente al lado de un
     * total calculado sobre toda.
     */
    known_coverage: number;
}

export interface TrafficReport {
    start: string;
    end: string;
    series: DailyTraffic[];
    totals: {
        sessions: number;
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
    /** Salidas a redes sociales desde el footer, de más a menos clicada. */
    socials: SocialStat[];
}

export interface SocialStat {
    /** Clave de `siteConfig.social`: instagram, tiktok, twitter… */
    network: string;
    clicks: number;
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
    sessions: number;
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
