import type { ProductPreviewFilters } from './types';

export function previewFilterKey(filters: ProductPreviewFilters): string {
    return JSON.stringify({
        platforms: [...new Set(filters.platforms ?? [])].sort((a, b) => a - b),
        platform: filters.platform ?? '', condition: filters.condition ?? '',
        seller: filters.seller ?? null, seller_locations: filters.seller_locations ?? '',
    });
}
