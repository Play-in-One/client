import { test, expect } from '@playwright/test';
import { buildDealsMetadata } from '../../src/app/ofertas/DealsLanding';
import { dealsPagePath, dealsRangeLabel, parseDealsPage, santiagoDate } from '../../src/lib/deals';

const platform = { id: 7, slug: 'ps5', name: 'PS5', display_name: 'PS5', long_name: 'PlayStation 5' };
const realFetch = globalThis.fetch;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
});

function backend(games: (url: URL) => Response, empty = false) {
    const urls: URL[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        urls.push(url);
        if (url.pathname.endsWith('/platforms/')) return json({ results: [platform] });
        if (url.pathname.endsWith('/deals/')) return json({
            date: santiagoDate(), last_scrape_at: null, count: empty ? 0 : 65, platforms: [], results: [],
        });
        return games(url);
    }) as typeof fetch;
    return urls;
}

test.afterEach(() => { globalThis.fetch = realFetch; });

test('page paths, safe page parsing and result ranges cover first, interior and last pages', () => {
    expect(dealsPagePath()).toBe('/ofertas');
    expect(dealsPagePath('ps5', 1)).toBe('/ofertas/ps5');
    expect(dealsPagePath(undefined, 2)).toBe('/ofertas/pagina/2');
    expect(dealsPagePath('ps5', 3)).toBe('/ofertas/ps5/pagina/3');
    for (const raw of ['0', '-1', '01', '1.5', 'abc', '9007199254740992']) expect(parseDealsPage(raw)).toBeUndefined();
    expect(parseDealsPage('2')).toBe(2);
    expect(dealsRangeLabel(1, 65)).toBe('Mostrando 1–24 de 65 ofertas');
    expect(dealsRangeLabel(3, 65)).toBe('Mostrando 49–65 de 65 ofertas');
});

test('interior metadata is self-canonical, noindex/follow and requests exactly 24 scoped games', async () => {
    const urls = backend(() => json({ count: 65, results: [{ id: 25 }] }));
    const meta = await buildDealsMetadata('ps5', 2);
    expect(meta.title).toContain('página 2');
    expect(meta.description).toContain('25–48 de 65');
    expect(meta.alternates?.canonical).toContain('/ofertas/ps5/pagina/2');
    expect(JSON.stringify(meta.robots)).toContain('"index":false');
    expect(JSON.stringify(meta.robots)).toContain('"follow":true');
    const games = urls.find((u) => u.pathname.endsWith('/games/'))!;
    expect(Object.fromEntries(games.searchParams)).toEqual({
        deals: '1', ordering: 'recommended', page: '2', page_size: '24', platforms: '7',
    });
});

test('a failed page load is rethrown, never converted to an empty offers page', async () => {
    backend(() => json({ detail: 'unavailable' }, 503));
    await expect(buildDealsMetadata()).rejects.toThrow(/503/);
    backend(() => { throw new TypeError('offline'); });
    await expect(buildDealsMetadata()).rejects.toThrow('offline');
});

test('missing interior pages and genuinely empty first pages are noindex', async () => {
    backend(() => json({ detail: 'missing' }, 404));
    expect((await buildDealsMetadata(undefined, 99999)).title).toBe('Página no encontrada');
    backend(() => json({ count: 0, results: [] }), true);
    expect(JSON.stringify((await buildDealsMetadata()).robots)).toContain('"index":false');
});
