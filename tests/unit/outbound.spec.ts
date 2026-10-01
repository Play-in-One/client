import { test, expect } from '@playwright/test';
import { NextRequest } from 'next/server';
import { handleOutbound } from '../../src/lib/server/outbound';
import { buildConsent } from '../../src/lib/consent';

const originalFetch = globalThis.fetch;
let calls: { url: string; options?: RequestInit }[];

test.beforeEach(() => { calls = []; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

function upstream(eventStatus = 201) {
    globalThis.fetch = async (input, options) => {
        const url = String(input);
        calls.push({ url, options });
        if (url.endsWith('/products/42/')) return Response.json({
            id: 42, game: 7, platform: { id: 3 }, seller: { id: 5 },
            url: 'https://shop.example/game', affiliate_url: 'https://shop.example/affiliate',
        });
        if (url.endsWith('/sellers/5/')) return Response.json({ id: 5, url: 'https://shop.example' });
        if (url.endsWith('/events/')) return new Response(null, { status: eventStatus });
        return new Response(null, { status: 404 });
    };
}

function request(path = '/go/product/42', choice?: 'accept' | 'essential' | 'reject-all') {
    return new NextRequest(`https://playinone.cl${path}`, { headers: {
        'user-agent': 'Browser WebKit Mobile',
        'x-forwarded-for': '192.0.2.1',
        'cf-ipcountry': 'CL',
        ...(choice ? { cookie: `pio_consent=${encodeURIComponent(JSON.stringify(buildConsent(choice)))}; pio_vid=signed-token` } : {}),
    } });
}

test('redirects to the catalog affiliate URL and records one attributed event', async () => {
    upstream();
    const response = await handleOutbound(request('/go/product/42?attr_utm_source=tiktok&attr_utm_medium=paid&attr_utm_campaign=launch'), 'product', '42');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://shop.example/affiliate');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    const events = calls.filter(call => call.url.endsWith('/events/'));
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].options!.body as string)).toMatchObject({
        event_type: 'offer_click', product: 42, game: 7, platform: 3,
        attr_utm_source: 'tiktok', attr_utm_medium: 'paid', attr_utm_campaign: 'launch',
    });
    expect(events[0].options!.headers).toMatchObject({ 'User-Agent': 'Browser WebKit Mobile', 'X-Forwarded-For': '192.0.2.1' });
});

test('reads a landing campaign before hydration without forwarding raw click IDs', async () => {
    upstream();
    const req = request();
    req.headers.set('referer', 'https://playinone.cl/?utm_source=google&utm_medium=cpc&gclid=private-click');
    await handleOutbound(req, 'product', '42');
    const body = JSON.parse(calls[1].options!.body as string);
    expect(body).toMatchObject({ attr_utm_source: 'google', attr_utm_medium: 'cpc', attr_click: 'gclid' });
    expect(JSON.stringify(body)).not.toContain('private-click');
});

test('uses the primary product URL when there is no affiliate URL', async () => {
    upstream();
    const fetchCatalog = globalThis.fetch;
    globalThis.fetch = async (input, options) => String(input).includes('/products/')
        ? Response.json({ id: 42, game: 7, platform: null, url: 'https://shop.example/game', affiliate_url: '' })
        : fetchCatalog(input, options);
    expect((await handleOutbound(request(), 'product', '42')).headers.get('location')).toBe('https://shop.example/game');
});

test('records a store exit and forwards the token only with analytics consent', async () => {
    upstream();
    const response = await handleOutbound(request('/go/store/5', 'accept'), 'store', '5');
    expect(response.headers.get('location')).toBe('https://shop.example/');
    expect(JSON.parse(calls[1].options!.body as string)).toMatchObject({ event_type: 'store_click', seller: 5, visitor_id: 'signed-token' });
});

test('anonymous measurement does not forward an old visitor cookie', async () => {
    upstream();
    await handleOutbound(request('/go/product/42', 'essential'), 'product', '42');
    expect(JSON.parse(calls[1].options!.body as string).visitor_id).toBeUndefined();
});

test('opt-out still opens the store without recording an event', async () => {
    upstream();
    const response = await handleOutbound(request('/go/product/42', 'reject-all'), 'product', '42');
    expect(response.status).toBe(302);
    expect(calls).toHaveLength(1);
});

for (const [header, value] of [['purpose', 'prefetch'], ['sec-purpose', 'prefetch;prerender'], ['next-router-prefetch', '1']]) {
    test(`does not record ${header} requests`, async () => {
        upstream();
        const req = request();
        req.headers.set(header, value);
        expect((await handleOutbound(req, 'product', '42')).status).toBe(302);
        expect(calls).toHaveLength(1);
    });
}

test('HEAD does not record a visit', async () => {
    upstream();
    const req = new NextRequest('https://playinone.cl/go/product/42', { method: 'HEAD' });
    expect((await handleOutbound(req, 'product', '42')).status).toBe(302);
    expect(calls).toHaveLength(1);
});

for (const status of [202, 400, 429, 500]) {
    test(`event response ${status} never prevents the redirect or triggers a retry`, async () => {
        upstream(status);
        expect((await handleOutbound(request(), 'product', '42')).status).toBe(302);
        expect(calls.filter(call => call.url.endsWith('/events/'))).toHaveLength(1);
    });
}

test('an event timeout still redirects to the resolved destination', async () => {
    upstream();
    const fetchCatalog = globalThis.fetch;
    globalThis.fetch = async (input, options) => String(input).endsWith('/events/')
        ? new Promise((_, reject) => options!.signal!.addEventListener('abort', () => reject(new Error('timeout'))))
        : fetchCatalog(input, options);
    expect((await handleOutbound(request(), 'product', '42')).status).toBe(302);
});

test('missing destinations and invalid catalog URLs do not redirect', async () => {
    upstream();
    expect((await handleOutbound(request(), 'product', '99')).status).toBe(404);
    globalThis.fetch = async () => Response.json({ id: 42, url: 'javascript:alert(1)' });
    expect((await handleOutbound(request(), 'product', '42')).status).toBe(502);
    expect((await handleOutbound(request(), 'product', 'bad')).status).toBe(404);
});

test('catalog transport failure returns a recoverable error without recording', async () => {
    globalThis.fetch = async () => { throw new Error('offline'); };
    const response = await handleOutbound(request(), 'product', '42');
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('Reintentar');
});
