import { test, expect } from '@playwright/test';
import { buildConsent } from '../../src/lib/consent';
import { CONSOLES_ENABLED } from '../../src/lib/features';

test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: 'pio_consent', value: encodeURIComponent(JSON.stringify(buildConsent('reject-all'))),
        domain: 'localhost', path: '/' }]);
});

test.describe('Public console experience', () => {
    test.skip(!CONSOLES_ENABLED, 'Frontend de consolas pendiente de desarrollo.');

test('catalog and detail expose console content in the initial HTML', async ({ request }) => {
    const catalog = await request.get('/consolas');
    expect(catalog.status()).toBe(200);
    expect(await catalog.text()).toContain('PS5 Slim');
    const detail = await request.get('/consola/ps5-slim-981');
    const html = await detail.text();
    expect(detail.status()).toBe(200);
    expect(html).toContain('Tienda Consolas');
    expect(html).toContain('Juego de aventura');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('/go/product/991');
});

test('filters compare an exact configuration and keep retired offers separate', async ({ page }) => {
    await page.goto('/consola/ps5-slim-981');
    await expect(page.locator('[data-console-offer]')).toHaveCount(3);
    await page.getByRole('combobox', { name: 'Configuración exacta', exact: true }).selectOption('11');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.locator('[data-console-offer]')).toHaveCount(2);
    await expect(page.locator('[data-console-minimum]')).toContainText('503.000');
    await expect(page.locator('[data-stock="false"]')).toContainText('Oferta agotada');
    await expect(page.locator('[data-stock="false"]').getByRole('link', { name: 'Ver en tienda' })).toHaveCount(0);
    await expect(page).toHaveURL(/configuration=11/);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Configuración exacta', exact: true })).toHaveValue('11');
    await expect(page.locator('[data-console-offer]')).toHaveCount(2);
});

test('packs include several games and unavailable selections have an honest empty state', async ({ page }) => {
    await page.goto('/consola/ps5-slim-981');
    await page.getByRole('combobox', { name: 'Juego incluido', exact: true }).selectOption('true');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.locator('[data-console-offer]')).toHaveCount(1);
    await expect(page.locator('[data-console-offer]')).toContainText('Juego de aventura');
    await expect(page.locator('[data-console-offer]')).toContainText('Juego de carreras');
    await page.getByRole('combobox', { name: 'Condición', exact: true }).selectOption('new');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByText('No hay ofertas para esta selección.')).toBeVisible();
    await expect(page.locator('[data-console-minimum]')).toContainText('Sin precio disponible');
});

test('global digital format does not hide physical console offers', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('pio_format', 'digital');
        document.cookie = `pio_prefs=${encodeURIComponent(JSON.stringify({ condition: 'used', format: 'digital', digital: 'key', international: true, national: true, region: null }))};path=/`;
    });
    const requests: URL[] = [];
    page.on('request', request => { if (request.url().includes('/api/consoles/981/')) requests.push(new URL(request.url())); });
    await page.goto('/consola/ps5-slim-981');
    await expect(page.locator('[data-console-offer]')).toHaveCount(1);
    expect(requests.some(url => url.searchParams.get('condition') === 'used')).toBe(true);
    expect(requests.some(url => ['key', 'store', 'digital'].includes(url.searchParams.get('condition') ?? ''))).toBe(false);
});

test('mobile navigation, search, and filters fit the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/consolas');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Consolas', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Plataforma', exact: true }).selectOption('switch');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByText('No hay consolas que coincidan con estos filtros.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto('/consola/ps5-slim-981');
    await expect(page.getByRole('heading', { name: 'PS5 Slim', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '/tmp/pio-console-mobile.png', fullPage: true });
});

test('console search, canonical redirect, sitemap, and store integration', async ({ page, request }) => {
    await page.goto('/search?category=console&q=PS5');
    await expect(page.getByRole('heading', { name: 'PS5 Slim' })).toBeVisible();
    const redirect = await request.get('/consola/old-name-981?storage_gb=1000', { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers().location).toContain('/consola/ps5-slim-981?storage_gb=1000');
    expect((await request.get('/consola/unknown-999')).status()).toBe(404);
    const sitemap = await request.get('/sitemap.xml');
    expect(await sitemap.text()).toContain('/consola/ps5-slim-981');
    await page.goto('/store/77');
    await expect(page.getByRole('heading', { name: 'Consolas en esta tienda' })).toBeVisible();
    await page.goto('/consola/ps5-slim-981');
    await page.screenshot({ path: '/tmp/pio-console-desktop.png', fullPage: true });
});

test('price fetch failure offers a retry and console paths can be revalidated', async ({ page, request }) => {
    await page.route('**/api/consoles/981/**', route => route.abort());
    await page.goto('/consola/ps5-slim-981');
    await expect(page.getByText('No pudimos actualizar las ofertas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
    const revalidation = await request.post('/api/revalidate', { headers: { 'x-revalidate-token': 'console-test-token' },
        data: { paths: ['/consolas', '/consola/ps5-slim-981'] } });
    expect(revalidation.status()).toBe(200);
});

});

test.describe('Consoles hidden from the public frontend', () => {
    test.skip(CONSOLES_ENABLED, 'La categoría de consolas está habilitada.');

    test('catalog, detail and console search are unavailable even by direct URL', async ({ request, page }) => {
        for (const path of ['/consolas', '/consola/ps5-slim-981']) {
            expect((await request.get(path)).status(), path).toBe(404);
        }
        await page.goto('/search?category=console&q=PS5');
        await expect(page).toHaveURL(/\/search\?q=PS5$/);
    });

    test('navigation, search and store pages do not advertise consoles', async ({ page }) => {
        for (const path of ['/search', '/store/77']) {
            await page.goto(path);
            await expect(page.locator('a[href^="/consola"]')).toHaveCount(0);
            await expect(page.getByRole('heading', { name: 'Consolas en esta tienda' })).toHaveCount(0);
        }
    });

    test('sitemap excludes the console catalog and its details', async ({ request }) => {
        const response = await request.get('/sitemap.xml');
        expect(response.status()).toBe(200);
        expect(await response.text()).not.toMatch(/<loc>[^<]*\/consolas?(?:\/|<)/);
    });
});
