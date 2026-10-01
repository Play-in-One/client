import { NextResponse, type NextRequest } from 'next/server';
import { CONSENT_COOKIE, VISITOR_COOKIE, parseConsent } from '@/lib/consent';

type OutboundKind = 'product' | 'store';
const CLICK_TYPES = ['gclid', 'gbraid', 'wbraid', 'ttclid', 'fbclid', 'msclkid'];
const ATTR_KEYS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'click'];
const RESPONSE_HEADERS = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };

function attribution(request: NextRequest): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of ATTR_KEYS) {
        const value = request.nextUrl.searchParams.get(`attr_${key}`)?.trim();
        if (value) result[`attr_${key}`] = value.slice(0, key === 'ref' ? 255 : 100);
    }
    // An HTML link works before hydration. Its same-origin Referer may still
    // contain the landing UTM, whereas the outbound URL has only a catalog ID.
    if (Object.keys(result).length === 0) {
        try {
            const ref = new URL(request.headers.get('referer') ?? '');
            if (ref.origin === request.nextUrl.origin) {
                for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
                    const value = ref.searchParams.get(key)?.trim();
                    if (value) result[`attr_${key}`] = value.slice(0, 100);
                }
                const click = CLICK_TYPES.find(key => ref.searchParams.has(key));
                if (click) result.attr_click = click;
            }
        } catch { /* no usable landing Referer */ }
    }
    if (result.attr_ref) {
        try { result.attr_ref = new URL(`https://${result.attr_ref.replace(/^https?:\/\//i, '')}`).hostname; }
        catch { delete result.attr_ref; }
    }
    if (result.attr_click && !CLICK_TYPES.includes(result.attr_click)) delete result.attr_click;
    return result;
}

function errorResponse(status: number): NextResponse {
    // Reload keeps the exact ID and attribution; no arbitrary destination is
    // reflected into the HTML or accepted as a redirect parameter.
    return new NextResponse('<!doctype html><html lang="es"><meta charset="utf-8"><title>No se pudo abrir la tienda</title><main><h1>No se pudo abrir la tienda</h1><p>Inténtalo nuevamente o vuelve a la página anterior.</p><a href="">Reintentar</a></main></html>', {
        status, headers: { ...RESPONSE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
    });
}

export async function handleOutbound(request: NextRequest, kind: OutboundKind, id: string): Promise<NextResponse> {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return errorResponse(404);
    const apiBase = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api').replace(/\/$/, '');
    const started = Date.now();
    const log = (result: string, status?: number) => console.info(JSON.stringify({
        event: 'outbound', kind, id: Number(id), result, status, duration_ms: Date.now() - started,
    }));
    let catalog: { url: string; affiliate_url?: string; game?: number; platform?: { id: number } | null };
    try {
        const upstream = await fetch(`${apiBase}/${kind === 'product' ? 'products' : 'sellers'}/${id}/`, {
            cache: 'no-store', signal: AbortSignal.timeout(2000),
        });
        if (!upstream.ok) {
            log('catalog_rejected', upstream.status);
            return errorResponse(upstream.status === 404 ? 404 : 503);
        }
        catalog = await upstream.json();
    } catch {
        log('catalog_unavailable');
        return errorResponse(503);
    }

    let destination: URL;
    try {
        destination = new URL((kind === 'product' && catalog.affiliate_url) || catalog.url);
        if (!['https:', 'http:'].includes(destination.protocol) || destination.username || destination.password) throw new Error('Invalid URL');
    } catch {
        log('invalid_destination');
        return errorResponse(502);
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
