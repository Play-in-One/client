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
    rating: string | null;
    min_price: string | null;
    on_sale: boolean;
    products?: Product[];
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
