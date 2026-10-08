import { NextResponse, type NextRequest } from 'next/server';
import { CONSENT_COOKIE, VISITOR_COOKIE, parseConsent } from '@/lib/consent';

type OutboundKind = 'product' | 'store';
const CLICK_TYPES = ['gclid', 'gbraid', 'wbraid', 'ttclid', 'fbclid', 'msclkid'];
const ATTR_KEYS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'click'];
const RESPONSE_HEADERS = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };

/**
 * The Referer, only when it is a page of this site. Behind Caddy,
 * `request.nextUrl` carries Next's internal host, so comparing origins never
 * matched; the public host is the one the proxy forwards.
 */
function siteReferer(request: NextRequest): URL | null {
    try {
        const ref = new URL(request.headers.get('referer') ?? '');
        const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host)
            .split(',')[0].trim().toLowerCase();
        return ['http:', 'https:'].includes(ref.protocol) && ref.host.toLowerCase() === host ? ref : null;
    } catch {
        return null;
    }
}

function attribution(request: NextRequest): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of ATTR_KEYS) {
        const value = request.nextUrl.searchParams.get(`attr_${key}`)?.trim();
        if (value) result[`attr_${key}`] = value.slice(0, key === 'ref' ? 255 : 100);
    }
    // An HTML link works before hydration. Its same-origin Referer may still
    // contain the landing UTM, whereas the outbound URL has only a catalog ID.
    const ref = Object.keys(result).length === 0 ? siteReferer(request) : null;
    if (ref) {
        for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
            const value = ref.searchParams.get(key)?.trim();
            if (value) result[`attr_${key}`] = value.slice(0, 100);
        }
        const click = CLICK_TYPES.find(key => ref.searchParams.has(key));
        if (click) result.attr_click = click;
    }
    if (result.attr_ref) {
        try { result.attr_ref = new URL(`https://${result.attr_ref.replace(/^https?:\/\//i, '')}`).hostname; }
        catch { delete result.attr_ref; }
    }
    if (result.attr_click && !CLICK_TYPES.includes(result.attr_click)) delete result.attr_click;
    return result;
}

const ERROR_STYLE = 'body{margin:0;font-family:system-ui,-apple-system,sans-serif;color:#1a1b1e;background:#fff}'
    + 'main{max-width:32rem;margin:0 auto;padding:3rem 1rem}h1{font-size:1.5rem;margin:0 0 .75rem}p{line-height:1.5;color:#495057}'
    + 'a{display:inline-block;margin-top:1rem;padding:.6rem 1.1rem;border-radius:.5rem;background:#e64980;color:#fff;text-decoration:none;font-weight:600}'
    + '@media (prefers-color-scheme:dark){body{color:#e9ecef;background:#1a1b1e}p{color:#adb5bd}}';

/** Same-origin page that linked here, as a path. Nothing else is reflected. */
function backPath(request: NextRequest): string | null {
    const ref = siteReferer(request);
    return ref && !ref.pathname.startsWith('/go/') ? `${ref.pathname}${ref.search}` : null;
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorResponse(request: NextRequest, status: number): NextResponse {
    // A 404 is permanent: the offer was removed after the page that links it
    // was rendered, so retrying cannot help. Other errors keep the reload,
    // which preserves the exact ID and attribution. No arbitrary destination
    // is reflected into the HTML or accepted as a redirect parameter.
    let title: string, text: string, link: string;
    if (status === 404) {
        const back = backPath(request);
        title = 'Esta oferta ya no está disponible';
        text = 'Esta oferta salió del catálogo después de que se cargó la página. Vuelve al juego para ver los precios actualizados.';
        link = back
            ? `<a href="${escapeHtml(back)}">Volver al juego</a>`
            : '<a href="/">Ir a Play In One</a>';
    } else {
        title = 'No se pudo abrir la tienda';
        text = 'Inténtalo nuevamente o vuelve a la página anterior.';
        link = '<a href="">Reintentar</a>';
    }
    return new NextResponse(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="/Icon_w.svg"><title>${title}</title><style>${ERROR_STYLE}</style><main><h1>${title}</h1><p>${text}</p>${link}</main></html>`, {
        status, headers: { ...RESPONSE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
    });
}

type Catalog = { url: string; affiliate_url?: string; game?: number; platform?: { id: number } | null };

// The backend shares two synchronous workers with bots and SSR, and under load
// a lookup took over 2 s: the visitor got an error page for a live offer. A
// slower redirect is better than none.
const CATALOG_TIMEOUT_MS = 5000;

// Destinations seldom change, so a repeated click must not wait on the backend
// again. Per process and bounded; only successful lookups are kept.
const CATALOG_TTL_MS = 10 * 60 * 1000;
const CATALOG_MAX_ENTRIES = 5000;
const catalogCache = new Map<string, { value: Catalog; expireAt: number }>();

function cachedCatalog(key: string): Catalog | null {
    const entry = catalogCache.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expireAt) {
        catalogCache.delete(key);
        return null;
    }
    return entry.value;
}

function rememberCatalog(key: string, value: Catalog): void {
    catalogCache.delete(key);
    if (catalogCache.size >= CATALOG_MAX_ENTRIES) {
        // Map keeps insertion order: the first key is the oldest entry.
        const oldest = catalogCache.keys().next().value;
        if (oldest !== undefined) catalogCache.delete(oldest);
    }
    catalogCache.set(key, { value: { url: value.url, affiliate_url: value.affiliate_url, game: value.game, platform: value.platform ? { id: value.platform.id } : null }, expireAt: Date.now() + CATALOG_TTL_MS });
}

export async function handleOutbound(request: NextRequest, kind: OutboundKind, id: string): Promise<NextResponse> {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return errorResponse(request, 404);
    const apiBase = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api').replace(/\/$/, '');
    const started = Date.now();
    const log = (result: string, status?: number) => console.info(JSON.stringify({
        event: 'outbound', kind, id: Number(id), result, status, duration_ms: Date.now() - started,
    }));
    const cacheKey = `${kind}:${id}`;
    let catalog = cachedCatalog(cacheKey);
    if (!catalog) {
        try {
            const upstream = await fetch(`${apiBase}/${kind === 'product' ? 'products' : 'sellers'}/${id}/`, {
                cache: 'no-store', signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
            });
            if (!upstream.ok) {
                log('catalog_rejected', upstream.status);
                return errorResponse(request, upstream.status === 404 ? 404 : 503);
            }
            catalog = await upstream.json() as Catalog;
            rememberCatalog(cacheKey, catalog);
        } catch {
            log('catalog_unavailable');
            return errorResponse(request, 503);
        }
    }

    let destination: URL;
    try {
        destination = new URL((kind === 'product' && catalog.affiliate_url) || catalog.url);
        if (!['https:', 'http:'].includes(destination.protocol) || destination.username || destination.password) throw new Error('Invalid URL');
    } catch {
        log('invalid_destination');
        return errorResponse(request, 502);
    }

    const consent = parseConsent(request.cookies.get(CONSENT_COOKIE)?.value ?? null);
    const prefetch = /prefetch|prerender/i.test(`${request.headers.get('purpose') ?? ''} ${request.headers.get('sec-purpose') ?? ''}`)
        || request.headers.has('next-router-prefetch');
    if (request.method === 'HEAD' || prefetch || consent?.measure === false) {
        log(request.method === 'HEAD' ? 'head' : prefetch ? 'prefetch' : 'opt_out');
    } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        for (const [incoming, outgoing] of [['user-agent', 'User-Agent'], ['x-forwarded-for', 'X-Forwarded-For'], ['cf-ipcountry', 'CF-IPCountry']]) {
            const value = request.headers.get(incoming);
            if (value) headers[outgoing] = value;
        }
        const payload = {
            ...(kind === 'product'
                ? { event_type: 'offer_click', product: Number(id), game: catalog.game, platform: catalog.platform?.id }
                : { event_type: 'store_click', seller: Number(id) }),
            ...(consent?.analytics ? { visitor_id: request.cookies.get(VISITOR_COOKIE)?.value } : {}),
            ...attribution(request),
        };
        try {
            const recorded = await fetch(`${apiBase}/events/`, {
                method: 'POST', headers, body: JSON.stringify(payload),
                cache: 'no-store', signal: AbortSignal.timeout(500),
            });
            log(recorded.status === 201 ? 'recorded' : recorded.status === 202 ? 'bot' : 'event_rejected', recorded.status);
        } catch {
            log('event_unavailable');
        }
    }
    return NextResponse.redirect(destination, { status: 302, headers: RESPONSE_HEADERS });
}
