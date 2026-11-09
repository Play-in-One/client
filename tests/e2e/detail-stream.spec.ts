import { test, expect } from '@playwright/test';

// Dedicated production server behind docs/performance/detail_proxy.py. Browser
// routing cannot delay SSR fetches, so ordinary page.route mocks cannot prove it.
const fixture = process.env.DETAIL_STREAM_FIXTURE;
const api = process.env.NEXT_PUBLIC_API_URL;
test.describe.configure({ mode: 'serial' });
test.skip(!fixture || !api, 'Requires the isolated delayed-SSR fixture');
test.use({ viewport: { width: 390, height: 844 } });

for (const prefs of [undefined, { format: 'physical', condition: 'new', international: false, national: true, digital: 'all', region: null }]) {
    test(`cover, name and scoped price precede the offers: ${prefs ? 'preferences' : 'default'}`, async ({ page, request }) => {
        await page.addInitScript(() => {
            const state = window as unknown as { streamLayoutShift: number };
            state.streamLayoutShift = 0;
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
                    if (!shift.hadRecentInput) state.streamLayoutShift += shift.value;
                }
            }).observe({ type: 'layout-shift', buffered: true });
        });
        await request.post(`${fixture}/__fixture/error`, { data: 'false' });
        const params = prefs ? '?condition=new&seller_locations=national,regions' : '';
        const preview = await (await request.get(`${api}/games/18379/preview/${params}`)).json();
        if (prefs) await page.context().addCookies([{ name: 'pio_prefs', value: encodeURIComponent(JSON.stringify(prefs)), url: test.info().project.use.baseURL as string }]);
        const started = Date.now();
        await page.goto(`/juego/${preview.slug}-${preview.id}`, { waitUntil: 'commit' });
        const shell = page.locator('[data-game-preview]');
        await expect(shell).toBeVisible();
        await expect(shell.getByRole('heading', { name: preview.name })).toBeVisible();
        await expect(shell.getByRole('img', { name: preview.name })).toBeVisible();
        const price = shell.locator('[data-game-preview-price]');
        const expected = preview.min_price == null ? 'Sin ofertas disponibles'
            : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(preview.min_price));
        await expect(price).toContainText(expected);
        await expect(price).toBeVisible();
        await expect.poll(async () => (await price.boundingBox())?.y ?? Infinity).toBeLessThan(700);
        await expect(page.getByRole('table', { name: 'Comparativa de precios' })).toHaveCount(0);
        const previewMs = Date.now() - started;
        await page.screenshot({ path: test.info().outputPath('preview-mobile.png') });
        await expect(shell).toHaveCount(0, { timeout: 15000 });
        if (preview.min_price == null) {
            await expect(page.locator('.pio-game-best-price')).toHaveCount(0);
            await expect(page.getByText('No hay productos disponibles con estos filtros')).toBeVisible();
        } else {
            await expect(page.locator('.pio-game-best-price')).toContainText(expected);
        }
        await page.screenshot({ path: test.info().outputPath('complete-mobile.png') });
        expect(await page.evaluate(() => (window as unknown as { streamLayoutShift: number }).streamLayoutShift)).toBeLessThanOrEqual(.1);
        await test.info().attach('stream-timing', { body: JSON.stringify({ preview_ms: previewMs, complete_ms: Date.now() - started, injected_delay_ms: 3000 }), contentType: 'application/json' });
    });
}

test('a failed full read preserves the preview and offers retry', async ({ page, request }) => {
    await request.post(`${fixture}/__fixture/error`, { data: 'true' });
    try {
        await page.goto('/juego/ball-x-pit-18379', { waitUntil: 'commit' });
        await expect(page.locator('[data-game-preview]')).toBeVisible();
        await expect(page.getByText('No pudimos cargar el resto de la ficha.')).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('link', { name: 'Reintentar' })).toBeVisible();
        await expect(page.locator('[data-game-preview-price]')).toBeVisible();
    } finally { await request.post(`${fixture}/__fixture/error`, { data: 'false' }); }
});
