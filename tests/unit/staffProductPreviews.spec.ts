import { test, expect } from '@playwright/test';
import { ProductPreviewStore } from '../../src/lib/staffProductPreviews';
import type { ProductPreview, ProductPreviewFilters } from '../../src/lib/types';

test('disabled does not fetch; enabled batches duplicates, filters and at most 100 ids', async () => {
    const calls: { ids: number[]; filters: ProductPreviewFilters }[] = [];
    const store = new ProductPreviewStore(async (ids, filters) => {
        calls.push({ ids, filters });
        return Object.fromEntries(ids.map(id => [id, [{ product_id: id, image: null }]]));
    });
    const revision = {};
    for (let id = 1; id <= 101; id++) store.subscribe(id, {}, revision, () => {});
    store.subscribe(1, {}, revision, () => {});
    store.subscribe(1, { platforms: [2, 1] }, revision, () => {});
    store.subscribe(2, { platforms: [1, 2] }, revision, () => {});
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(calls).toHaveLength(0);
    store.configure(true, 'staff');
    await expect.poll(() => calls.length).toBe(3);
    expect(calls.filter(call => !call.filters.platforms).map(call => call.ids.length)).toEqual([100, 1]);
    expect(calls.find(call => call.filters.platforms)?.ids).toEqual([1, 2]);
    expect(store.getSnapshot(1, {})).toEqual([{ product_id: 1, image: null }]);
    store.configure(false, null);
});

test('disable and session change cancel pending requests and ignore late responses', async () => {
    const pending: { resolve: (data: Record<string, ProductPreview[]>) => void; signal: AbortSignal }[] = [];
    const store = new ProductPreviewStore((_ids, _filters, signal) => new Promise(resolve => pending.push({ resolve, signal })));
    store.configure(true, 'first');
    store.subscribe(1, {}, {}, () => {});
    await expect.poll(() => pending.length).toBe(1);
    store.configure(false, null);
    expect(pending[0].signal.aborted).toBe(true);
    pending[0].resolve({ 1: [{ product_id: 7, image: 'old' }] });
    await Promise.resolve();
    expect(store.getSnapshot(1, {})).toBeUndefined();
    store.configure(true, 'second');
    await expect.poll(() => pending.length).toBe(2);
    pending[1].resolve({ 1: [{ product_id: 8, image: 'new' }] });
    await expect.poll(() => store.getSnapshot(1, {})).toEqual([{ product_id: 8, image: 'new' }]);
    store.configure(false, null);
});

test('unmounted or refreshed cards discard stale results; failures fall back without a request loop', async () => {
    let resolve!: (data: Record<string, ProductPreview[]>) => void;
    let calls = 0;
    const store = new ProductPreviewStore(() => {
        calls++;
        if (calls === 1) return new Promise(done => { resolve = done; });
        return Promise.reject(new Error('offline'));
    });
    store.configure(true, 'staff');
    const unsubscribe = store.subscribe(1, { platforms: [1] }, {}, () => {});
    await expect.poll(() => calls).toBe(1);
    unsubscribe();
    store.subscribe(1, { platforms: [2] }, {}, () => {});
    resolve({ 1: [{ product_id: 9, image: 'wrong console' }] });
    await expect.poll(() => calls).toBe(2);
    expect(store.getSnapshot(1, { platforms: [2] })).toBeUndefined();
    await new Promise(done => setTimeout(done, 60));
    expect(calls).toBe(2);
    store.subscribe(1, { platforms: [2] }, {}, () => {});
    await expect.poll(() => calls).toBe(3);
    store.configure(false, null);
});
test('refresh during an in-flight batch discards the earlier card revision', async () => {
    const pending: ((data: Record<string, ProductPreview[]>) => void)[] = [];
    const store = new ProductPreviewStore(() => new Promise(resolve => pending.push(resolve)));
    store.configure(true, 'staff');
    store.subscribe(1, {}, { revision: 'old' }, () => {});
    await expect.poll(() => pending.length).toBe(1);
    store.subscribe(1, {}, { revision: 'new' }, () => {});
    await expect.poll(() => pending.length).toBe(2);
    pending[0]({ 1: [{ product_id: 1, image: 'old' }] });
    await Promise.resolve();
    expect(store.getSnapshot(1, {})).toBeUndefined();
    pending[1]({ 1: [{ product_id: 2, image: 'new' }] });
    await expect.poll(() => store.getSnapshot(1, {})).toEqual([{ product_id: 2, image: 'new' }]);
    store.configure(false, null);
});
