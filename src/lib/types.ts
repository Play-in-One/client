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

/* ── Paginated response wrapper ── */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
