import { test, expect } from '@playwright/test';
import { buildLandingMetadata } from '../../src/app/juegos/[slug]/landing';

/* La landing por consola se regenera por ISR: si un fallo del backend se
 * tradujera en "0 juegos" + `noindex`, esa versión quedaría cacheada 300 s.
 * Se simula el backend sustituyendo `fetch` global (lo que usa `lib/api`). */

const PLATFORM = { id: 7, slug: 'ps5', name: 'PS5', display_name: 'PS5', long_name: 'PlayStation 5' };
const realFetch = globalThis.fetch;

function stubBackend(games: (url: string) => Response) {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/platforms/')) {
            return new Response(JSON.stringify({ count: 1, next: null, previous: null, results: [PLATFORM] }), {
                status: 200, headers: { 'Content-Type': 'application/json' },
            });
        }
        return games(url);
    }) as typeof fetch;
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const robots = (m: Awaited<ReturnType<typeof buildLandingMetadata>>) => JSON.stringify(m.robots ?? null);

test.afterEach(() => {
    globalThis.fetch = realFetch;
});

test('a backend 5xx is rethrown instead of rendering an empty noindex landing', async () => {
    stubBackend(() => json({ detail: 'boom' }, 503));
    await expect(buildLandingMetadata('ps5', 1)).rejects.toThrow(/503/);
});

test('a network failure is rethrown too', async () => {
    stubBackend(() => { throw new TypeError('fetch failed'); });
    await expect(buildLandingMetadata('ps5', 1)).rejects.toThrow(/fetch failed/);
});

test('a DRF 404 on an interior page is a genuinely missing page', async () => {
    stubBackend(() => json({ detail: 'Página inválida.' }, 404));
    const meta = await buildLandingMetadata('ps5', 9999);
    expect(meta.title).toBe('Página no encontrada');
    expect(robots(meta)).toContain('"index":false');
});

test('a genuinely empty page 1 is noindex; a populated one is indexable', async () => {
    stubBackend(() => json({ count: 0, next: null, previous: null, results: [] }));
    expect(robots(await buildLandingMetadata('ps5', 1))).toContain('"index":false');

    stubBackend(() => json({
        count: 1, next: null, previous: null,
        results: [{ id: 1, name: 'Juego X', min_price: '1000', min_price_seller: { id: 2, name: 'Tienda' } }],
    }));
    expect(robots(await buildLandingMetadata('ps5', 1))).not.toContain('"index":false');
});

test('during the build a failure degrades without marking the landing noindex', async () => {
    const previous = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = 'phase-production-build';
    try {
        stubBackend(() => json({ detail: 'boom' }, 503));
        const meta = await buildLandingMetadata('ps5', 1);
        // En el build no se lanza (rompería el deploy), pero un backend caído
        // tampoco debe hornear un `noindex` en la landing.
        expect(robots(meta)).not.toContain('"index":false');
    } finally {
        if (previous === undefined) delete process.env.NEXT_PHASE;
        else process.env.NEXT_PHASE = previous;
    }
});
