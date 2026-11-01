import { expect, test } from '@playwright/test';
import { SharedGet } from '../../src/lib/sharedGet';

test('calls the transport without binding the store as its receiver', async () => {
    const store = new SharedGet(async function (this: unknown) {
        expect(this).toBeUndefined();
        return Response.json({ ok: true });
    });
    expect(await (await store.request('https://api.example/games')).json()).toEqual({ ok: true });
});

test('shares concurrent reads but each subscriber can consume its own body', async () => {
    let resolve!: (response: Response) => void;
    let calls = 0;
    const store = new SharedGet(async () => { calls++; return new Promise(done => { resolve = done; }); });
    const first = store.request('https://api.example/games');
    const second = store.request('https://api.example/games');
    expect(calls).toBe(1);
    resolve(Response.json({ count: 1 }));
    expect(await (await first).json()).toEqual({ count: 1 });
    expect(await (await second).json()).toEqual({ count: 1 });
});

test('aborting one subscriber preserves the other; last abort cancels transport', async () => {
    let underlying!: AbortSignal;
    const store = new SharedGet(async (_url, init) => {
        underlying = init!.signal!;
        return new Promise((_resolve, reject) => underlying.addEventListener('abort', () => reject(new Error('stopped'))));
    });
    const a = new AbortController(), b = new AbortController();
    const first = store.request('https://api.example/games', { signal: a.signal });
    const second = store.request('https://api.example/games', { signal: b.signal });
    const rejectedA = expect(first).rejects.toHaveProperty('name', 'AbortError');
    a.abort();
    await rejectedA;
    expect(underlying.aborted).toBe(false);
    const rejectedB = expect(second).rejects.toHaveProperty('name', 'AbortError');
    b.abort();
    await rejectedB;
    expect(underlying.aborted).toBe(true);
});

test('completed responses are not reused on a later navigation', async () => {
    let calls = 0;
    const store = new SharedGet(async () => Response.json({ generation: ++calls }));
    expect(await (await store.request('https://api.example/games')).json()).toEqual({ generation: 1 });
    expect(await (await store.request('https://api.example/games')).json()).toEqual({ generation: 2 });
});
