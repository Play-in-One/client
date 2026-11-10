import { test, expect } from '@playwright/test';
import { SEEDED } from './helpers';

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
        // The preview paints the same best-price frame as the complete page
        // (`hero/GameHero.tsx`); without an offer its price stays a skeleton.
        const price = shell.locator('[data-best-price]');
        const expected = preview.min_price == null ? null
            : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(preview.min_price));
        if (expected) await expect(price).toContainText(expected);
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
            await expect(page.locator('.pio-game-best-price')).toContainText(expected!);
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
        await expect(page.locator('[data-game-preview] [data-best-price]')).toBeVisible();
    } finally { await request.post(`${fixture}/__fixture/error`, { data: 'false' }); }
});

// Mientras la página carga, el botón de recargar de la barra es la X de
// "detener": pulsarlo en el hueco entre el preview y la ficha completa corta
// la respuesta RSC. La página tiene que decirlo como una carga interrumpida y
// su "Reintentar" tiene que pedir un documento nuevo; `reset()` volvía a leer
// el mismo stream cortado y el botón no hacía nada.
test('stopping a client navigation mid-stream offers a retry that recovers', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/juegos/ps5');
    const card = page.locator(`a[href*="-${SEEDED.gameId}"]`).first();
    await expect(card).toBeVisible();
    await card.click();
    // Con el preview ya pintado el router aceptó la respuesta y sigue leyendo
    // el stream: cortar antes hace que Next caiga solo a una carga completa.
    await expect(page.locator('[data-game-preview]')).toBeAttached();
    await page.evaluate(() => window.stop());

    await expect(page.getByLabel('Cargando la página')).toBeVisible();
    await expect(page.getByText('La carga se interrumpió antes de terminar.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Inténtalo nuevamente en unos momentos.')).toHaveCount(0);

    const reloaded = page.waitForEvent('framenavigated');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await reloaded;
    await expect(page.locator('.pio-game-best-price')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('No pudimos cargar esta página')).toHaveCount(0);
});

// Cortar la carga también aborta los chunks de la ruta que estaban en vuelo.
// El error ya no habla de la red (un chunk que no cargó, o el #130 de React con
// el módulo sin definir) y caía en "Inténtalo nuevamente", cuyo `reset()` no
// podía traer el archivo que faltaba.
test('a route chunk that never loaded is an interrupted load and retry recovers it', async ({ page }) => {
    test.setTimeout(45_000);
    // Sin esto `StaleChunkReload` recarga sola la pestaña (una vez por minuto).
    await page.addInitScript(() => sessionStorage.setItem('pio-stale-chunk-reload', String(Date.now())));
    await page.goto('/juegos/ps5');
    await page.route(/\/_next\/static\/chunks\/app\/juego\/.*page-[^/]*\.js/, route => route.abort('aborted'));
    await page.locator(`a[href*="-${SEEDED.gameId}"]`).first().click();

    await expect(page.getByText('La carga se interrumpió antes de terminar.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Inténtalo nuevamente en unos momentos.')).toHaveCount(0);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    const reloaded = page.waitForEvent('framenavigated');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await reloaded;
    await expect(page.locator('.pio-game-best-price')).toBeVisible({ timeout: 15_000 });
});
