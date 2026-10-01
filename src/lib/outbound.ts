import type { Attribution } from './attribution';

export function outboundHref(kind: 'product' | 'store', id: number, attribution: Attribution): string {
    const params = new URLSearchParams();
    for (const key of ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'click'] as const) {
        const value = attribution[key];
        if (value) params.set(`attr_${key}`, value);
    }
    const query = params.toString();
    return `/go/${kind}/${id}${query ? `?${query}` : ''}`;
}
