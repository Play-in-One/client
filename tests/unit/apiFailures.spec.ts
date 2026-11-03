import { test, expect } from '@playwright/test';
import { getGames, setAdminToken } from '../../src/lib/api';
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let now = originalNow();
let calls = 0;
test.beforeEach(() => {
    setAdminToken(null); calls = 0; now += 60_000;
    Date.now = () => now;
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 404 }); };
});
test.afterEach(() => { globalThis.fetch = originalFetch; Date.now = originalNow; setAdminToken(null); });
const missing = (search: string) => getGames({ search }).catch(() => undefined);
test('404 cache bounds LRU entries and expires after ten seconds', async () => {
    for (let i = 0; i < 512; i++) await missing(String(i));
    await missing('0'); await missing('512'); await missing('0');
    expect(calls).toBe(513);
    await missing('1'); expect(calls).toBe(514);
    now += 10_001; await missing('0'); expect(calls).toBe(515);
});
test('transient failures retry and session changes clear cached failures', async () => {
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 503 }); };
    await missing('transient'); await missing('transient'); expect(calls).toBe(2);
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 404 }); };
    await missing('missing'); await missing('missing'); expect(calls).toBe(3);
    setAdminToken('new-test-session'); await missing('missing'); expect(calls).toBe(4);
});
const socketClosed = () => Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_SOCKET' } });
test('a closed connection is retried once on the server', async () => {
    globalThis.fetch = async () => {
        calls++;
        if (calls === 1) throw socketClosed();
        return Response.json({ count: 0, next: null, previous: null, results: [] });
    };
    expect((await getGames({ search: 'retry' })).count).toBe(0);
    expect(calls).toBe(2);
});
test('the retry escapes the per-render fetch memoization of Next', async () => {
    // Como `dedupe-fetch` de Next: un GET sin signal reutiliza la promesa, también rechazada.
    const memo = new Map<string, Promise<Response>>();
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
        if (!init?.signal && memo.has(url)) return memo.get(url)!;
        calls++;
        const promise = calls === 1 ? Promise.reject(socketClosed())
            : Promise.resolve(Response.json({ count: 0, next: null, previous: null, results: [] }));
        if (!init?.signal) memo.set(url, promise);
        return promise;
    }) as typeof fetch;
    expect((await getGames({ search: 'memoized' })).count).toBe(0);
    expect(calls).toBe(2);
});
test('a second closed connection or another network error is not retried', async () => {
    globalThis.fetch = async () => { calls++; throw socketClosed(); };
    await expect(getGames({ search: 'twice' })).rejects.toThrow('fetch failed');
    expect(calls).toBe(2);
    calls = 0;
    globalThis.fetch = async () => { calls++; throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ETIMEDOUT' } }); };
    await expect(getGames({ search: 'timeout' })).rejects.toThrow('fetch failed');
    expect(calls).toBe(1);
});
