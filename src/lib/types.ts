/* ── TypeScript interfaces mirroring Django REST API ── */

export interface Platform {
    /** Idéntico a `slug`: el backend los mantiene iguales por catálogo. La
     *  serie de `min_price_history` se indexa por este campo. */
    name: string;
    id: number;
    slug: string;
    /** Abreviatura: "PS5", "Switch", "Windows". Para el nombre completo, ver
     *  `PLATFORM_LONG_LABELS` o el `long_name` que publica la API. */
    display_name: string;
    long_name?: string;
    /** Marca por la que se agrupa el menú: playstation | xbox | nintendo | pc. */
    family?: string;
    /** Orden de negocio (familia y generación), no alfabético. */
    order?: number;
    game_count?: number;
}

/**
 * El nombre LARGO de una consola: el que se lee de corrido.
 *
 * `display_name` es el abreviado ("NS", "Win", "XSeries") y no sirve para un
 * título ni para una frase — "Juegos de Win baratos en Chile" no lo lee nadie.
 * Todo lo que sea texto corrido, metadata o dato estructurado pasa por aquí; el
 * abreviado se queda para las insignias y los selectores estrechos.
 *
 * El fallback cubre a un backend anterior a `long_name`, que no lo publicaba.
 *
 * Vive en este módulo, y no en el catálogo de `platforms.ts`, porque lo usan
 * Server Components y páginas que no necesitan nada más: importar el catálogo
 * arrastraría con él los iconos de las 17 consolas.
 */
export function platformLongName(platform: Platform): string {
    return platform.long_name || platform.display_name;
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
    /** Convenio activo con esta tienda. Interruptor maestro: si es `false`,
     *  ignorar coupon_code/coupon_discount_percent aunque vengan cargados. */
    has_agreement: boolean;
    /** Código de cupón del convenio. Vacío si no hay uno cargado. */
    coupon_code: string;
    /** Descuento del cupón en %, ej. 5 = 5%. `null` si no hay cupón. Se aplica
     *  sobre el precio de LISTA de la oferta (antes de envío), en el carrito
     *  de la tienda externa. */
    coupon_discount_percent: number | null;
}

export interface SellerAddress {
    id: number;
    label: string;
    address: string;
}

/** Seller con convenio y cupón realmente aplicables (no solo cargados):
 *  `has_agreement` apagado ignora el resto aunque tenga datos. */
export function activeCoupon(
    seller: Pick<Seller, 'has_agreement' | 'coupon_code' | 'coupon_discount_percent'>,
): { code: string; percent: number } | null {
    if (!seller.has_agreement || !seller.coupon_code) return null;
    if (!seller.coupon_discount_percent || seller.coupon_discount_percent <= 0) return null;
    return { code: seller.coupon_code, percent: seller.coupon_discount_percent };
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
    /** Link de afiliado (opcional). Cuando existe, reemplaza a `url` como
     *  destino de los botones "Ir a la Tienda" / "Ver en Tienda". */
    affiliate_url: string;
    image: string | null;
    seller: Seller;
    /* El backend guarda de DÓNDE sale una descarga, no solo que lo es: `store`
     * es la tienda oficial y `key` un código de canje. La UI las colapsa todas
     * en "Digital" (ver `lib/conditions.ts`); comparar `=== 'digital'` por
     * igualdad se come las otras tres. */
    condition: 'new' | 'used' | 'digital' | 'store' | 'key' | 'download';
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
     *  discrepar. null cuando el juego no tiene ninguna oferta con precio.
     *  Trae también sus campos de cupón (min_price ya viene descontado si
     *  aplica; estos son para que la tarjeta pueda mostrar el ícono/desglose
     *  sin cargar el producto completo). */
    min_price_seller?: Pick<
        Seller, 'id' | 'name' | 'has_agreement' | 'coupon_code' | 'coupon_discount_percent'
    > | null;
    /** Condición de la MISMA oferta que fija `min_price`, en el vocabulario de
     *  almacenamiento. Opcional: un backend anterior no lo manda y la tarjeta
     *  simplemente no pinta el 💾. */
    min_price_condition?: Product['condition'] | null;
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

export interface GameClickWindow {
    game_clicks: number;
    offer_clicks: number;
    conversion_rate: number;
}

export interface ProductClickCounts {
    today: number;
    last_7d: number;
    last_30d: number;
}

export interface GameClickStats {
    game_id: number;
    today: GameClickWindow;
    last_7d: GameClickWindow;
    last_30d: GameClickWindow;
    products: Record<string, ProductClickCounts>;
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

/* ── Rendimiento percibido (RUM) ── */

/** Percentiles de un día, o de un rango. `page_path: ""` = todo el sitio. */
export interface PagePerfRow {
    page_path: string;
    samples: number;
    date?: string;
    lcp_p50: number | null;
    lcp_p75: number | null;
    lcp_p95: number | null;
    ttfb_p50: number | null;
    ttfb_p75: number | null;
    ttfb_p95: number | null;
    load_p50: number | null;
    load_p75: number | null;
    load_p95: number | null;
    server_p50: number | null;
    server_p75: number | null;
    server_p95: number | null;
    inp_p75: number | null;
    fcp_p75: number | null;
    cls_p75: number | null;
    good_lcp: number;
    poor_lcp: number;
    good_lcp_rate?: number;
    poor_lcp_rate?: number;
}

export interface PerformanceReport {
    start: string;
    end: string;
    /** Solo la fila global de cada día: es el único p75 componible en el tiempo. */
    series: PagePerfRow[];
    totals: PagePerfRow | { samples: number };
    /** Excluye la fila global; ordenado de peor a mejor. */
    by_path: PagePerfRow[];
    /** Días de historial en crudo que hay realmente. */
    raw_window_days: number;
    /** `true` si se pidió un rango mayor del que existe en crudo. */
    truncated: boolean;
}

/** Una carga concreta, con todo su detalle. Lo que se mira para un caso suelto. */
export interface PageLoadDetail {
    id: number;
    created_at: string;
    page_path: string;
    request_id: string;
    nav_type: string;
    cache_state: string;
    dns_ms: number | null;
    tcp_ms: number | null;
    tls_ms: number | null;
    request_ms: number | null;
    response_ms: number | null;
    ttfb_ms: number | null;
    dom_interactive_ms: number | null;
    dom_content_loaded_ms: number | null;
    load_event_ms: number | null;
    fcp_ms: number | null;
    lcp_ms: number | null;
    inp_ms: number | null;
    cls: number | null;
    server_ms: number | null;
    server_db_ms: number | null;
    server_queries: number | null;
    api_calls: number | null;
    server_view: string;
    device_type: string;
    connection_type: string;
    country: string;
    session_id: string;
    lcp_rating: string;
    network_ms: number | null;
    /** TTFB menos lo que fue Django: el render de Next. Derivado. */
    frontend_ms: number | null;
    client_render_ms: number | null;
}

export interface SlowestReport {
    start: string;
    end: string;
    metric: string;
    results: PageLoadDetail[];
}

/* ── Paginated response wrapper ── */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
