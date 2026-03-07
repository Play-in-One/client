/* ── TypeScript interfaces mirroring Django REST API ── */

export interface Platform {
    id: number;
    name: string;        // "ps5" | "ps4" | "ps3" | "xbox" | "switch" | "switch2" | "pc" | "wii" | "nds" | "3ds" | "wiiu"
    slug: string;
    display_name: string; // "PS5" | "PS4" | "Xbox" | "Switch" | "Switch 2" | "PC"
}

export interface Seller {
    id: number;
    name: string;
    url: string;
    logo: string | null;
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
    products?: Product[];
}

export interface Post {
    id: number;
    title: string;
    category: 'news' | 'update' | 'deals' | 'comunity' | 'gaming';
    description: string;
    image: string | null;
    published_date: string;
}

/* ── Paginated response wrapper ── */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
