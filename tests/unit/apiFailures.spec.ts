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
