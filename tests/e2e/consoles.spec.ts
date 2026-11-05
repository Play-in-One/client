import { test, expect, type Page } from '@playwright/test';
import { buildConsent } from '../../src/lib/consent';
import { CONSOLES_PUBLIC, CONSOLES_STAFF_PREVIEW, CONSOLES_VISIBILITY } from '../../src/lib/features';

/* Runs with `npm run test:consoles` against `tests/fixtures/console-api.mjs`.
   Model 981 has five packs: 11 (1 TB, no game: a live and a retired offer),
   12 (two games, used offer, the cheapest), 13 (one live offer), 14 and 15
   (no offers). Only the describe for the current CONSOLES_VISIBILITY runs. */

test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: 'pio_consent', value: encodeURIComponent(JSON.stringify(buildConsent('reject-all'))),
        domain: 'localhost', path: '/' }]);
});

const signInAsStaff = (page: Page) => page.addInitScript(() => {
    localStorage.setItem('pio_admin_token', 'staff-test-token');
    localStorage.setItem('pio_admin_user', 'staff');
});

const offers = (page: Page) => page.locator('[data-console-offer]');
const segment = (page: Page, group: string, option: string) =>
    page.locator(`[aria-label="${group}"]`).getByText(option, { exact: true });

/* The pack picker and the offer list are shared by both visible modes. */
async function comparePacks(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    await expect(page.getByRole('heading', { name: 'PS5 Slim', exact: true })).toBeVisible();
    await expect(page.locator('[data-console-pack]')).toHaveCount(6);
    await expect(offers(page)).toHaveCount(4);
    await expect(page.locator('[data-console-minimum]')).toContainText('453.000');
    await expect(page.locator('[data-stock="false"]')).toContainText('Oferta agotada');
    await expect(page.locator('[data-stock="false"]').getByRole('link', { name: 'Ver en tienda' })).toHaveCount(0);

    await page.locator('a[href*="configuration=11"]').click();
    await expect(page).toHaveURL(/configuration=11/);
    await expect(offers(page)).toHaveCount(2);
    await expect(page.locator('[data-console-minimum]')).toContainText('503.000');
    // Choosing a pack keeps every other pack on screen.
    await expect(page.locator('[data-console-pack]')).toHaveCount(6);
    await page.reload();
    await expect(page.locator('a[href*="configuration=11"][aria-current="true"]')).toBeVisible();
    await expect(offers(page)).toHaveCount(2);
}

/* The counter is the PS5 landing's own total and leads to it. */
async function gamesCounterLinksToTheGallery(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    const counter = page.locator('[data-console-games]');
    await expect(counter).toContainText('1.234 juegos compatibles');
    await expect(counter).toHaveAttribute('href', '/juegos/ps5');
}

/* 982 (PS5 Pro) is listed on the same platform: the switcher links to it. */
async function switchesBetweenModels(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    const models = page.getByRole('navigation', { name: 'Modelos de PlayStation 5' });
    await expect(models.getByRole('link', { name: 'PS5 Slim' })).toHaveAttribute('aria-current', 'page');
    await expect(models.getByRole('link', { name: /PS5 Pro/ })).toHaveAttribute('href', '/consola/ps5-pro-982');
    await expect(models.getByRole('link', { name: /PS5 Pro/ })).toContainText('899.990');
}

async function honestEmptyStates(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    await page.locator('a[href*="configuration=12"]').click();
    await expect(offers(page)).toHaveCount(1);
    await expect(page.locator('[data-console-pack][data-selected]')).toContainText('Juego de aventura + Juego de carreras');
    await segment(page, 'Condición', 'Nuevo').click();
    await expect(page.getByText('No hay ofertas para esta selección.')).toBeVisible();
    await expect(page.locator('[data-console-minimum]')).toContainText('Sin precio disponible');
    // The used-only pack 12 has no new offer, so its tile says so instead of vanishing.
    await expect(page.locator('[data-console-pack]', { hasText: 'Juego de aventura' })).toContainText('Sin ofertas vigentes');
}

async function hardwareIgnoresDigitalFormat(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('pio_format', 'digital');
        document.cookie = `pio_prefs=${encodeURIComponent(JSON.stringify({ condition: 'used', format: 'digital', digital: 'key', international: true, national: true, region: null }))};path=/`;
    });
    const requests: URL[] = [];
    page.on('request', request => { if (request.url().includes('/api/consoles/981/')) requests.push(new URL(request.url())); });
    await page.goto('/consola/ps5-slim-981');
    await expect(offers(page)).toHaveCount(1);
    expect(requests.some(url => url.searchParams.get('condition') === 'used')).toBe(true);
    expect(requests.some(url => ['key', 'store', 'digital'].includes(url.searchParams.get('condition') ?? ''))).toBe(false);
}

async function mobileFits(page: Page) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/consolas');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.getByRole('dialog').getByRole('link', { name: /^Consolas/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('navigation', { name: 'Plataforma' }).getByRole('link', { name: 'Nintendo Switch', exact: true }).click();
    await expect(page.getByText('No hay consolas que coincidan con estos filtros.')).toBeVisible();
    await expect(page).toHaveURL(/platform=switch/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto('/consola/ps5-slim-981');
    await expect(page.getByRole('heading', { name: 'PS5 Slim', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function failureOffersRetry(page: Page) {
    await page.route('**/api/consoles/981/**', route => route.abort());
    await page.goto('/consola/ps5-slim-981');
    await expect(page.getByText('No pudimos actualizar las ofertas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
}

test.describe('Staff preview of the console pages', () => {
    test.skip(!CONSOLES_STAFF_PREVIEW, `Las consolas están en modo ${CONSOLES_VISIBILITY}.`);

    test('visitors get the 404 body, a noindex page and no links anywhere', async ({ page, request }) => {
        for (const path of ['/consolas', '/consola/ps5-slim-981']) {
            await page.goto(path);
            await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
            await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
            await expect(page.getByText('PS5 Slim')).toHaveCount(0);
        }
        for (const path of ['/', '/search', '/store/77']) {
            await page.goto(path);
            await expect(page.locator('a[href^="/consola"]')).toHaveCount(0);
            await expect(page.getByRole('heading', { name: 'Consolas en esta tienda' })).toHaveCount(0);
        }
        await page.goto('/search?category=console&q=PS5');
        await expect(page).toHaveURL(/\/search\?q=PS5$/);
        const sitemap = await request.get('/sitemap.xml');
        expect(await sitemap.text()).not.toMatch(/<loc>[^<]*\/consolas?(?:\/|<)/);
    });

    test('an admin sees the catalog with drafts, loaded with the staff token', async ({ page }) => {
        await signInAsStaff(page);
        const authorized: boolean[] = [];
        page.on('request', request => {
            if (request.url().includes('/api/consoles/')) authorized.push(request.headers().authorization === 'Token staff-test-token');
        });
        await page.goto('/consolas');
        await expect(page.getByRole('heading', { name: 'Consolas', level: 1 })).toBeVisible();
        await expect(page.locator('[data-staff-preview]')).toContainText('Solo los administradores');
        const card = page.locator('[data-console-card]', { hasText: 'PS5 Slim' });
        await expect(card).toContainText('Borrador');
        await expect(card).toContainText('453.000');
        await expect(card).toContainText('3 packs');
        await expect(page.getByRole('link', { name: /^Consolas\s*staff$/i }).first()).toBeVisible();
        expect(authorized.length).toBeGreaterThan(0);
        expect(authorized.every(Boolean)).toBe(true);
    });

    test('an outdated slug is corrected and an unknown model reads as not found', async ({ page }) => {
        await signInAsStaff(page);
        await page.goto('/consola/old-name-981?configuration=11');
        await expect(page).toHaveURL(/\/consola\/ps5-slim-981\?configuration=11$/);
        await page.goto('/consola/unknown-999');
        await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    });

    test('packs narrow the offers and keep retired offers apart', async ({ page }) => {
        await signInAsStaff(page);
        await comparePacks(page);
    });

    test('the games counter links to the console gallery', async ({ page }) => {
        await signInAsStaff(page);
        await gamesCounterLinksToTheGallery(page);
    });

    test('a switcher leads to the other models of the console', async ({ page }) => {
        await signInAsStaff(page);
        await switchesBetweenModels(page);
    });

    test('offers open the store directly, since /go cannot see drafts', async ({ page }) => {
        await signInAsStaff(page);
        await page.goto('/consola/ps5-slim-981');
        const exits = page.locator('[data-console-offer] a[target="_blank"]');
        await expect(exits.first()).toHaveAttribute('href', /^https:\/\/example\.com\//);
        await expect(page.locator('a[href*="/go/product/"]')).toHaveCount(0);
    });

    test('pack selections without offers have an honest empty state', async ({ page }) => {
        await signInAsStaff(page);
        await honestEmptyStates(page);
    });

    test('global digital format does not hide physical console offers', async ({ page }) => {
        await signInAsStaff(page);
        await hardwareIgnoresDigitalFormat(page);
    });

    test('mobile navigation and filters fit the viewport', async ({ page }) => {
        await signInAsStaff(page);
        await mobileFits(page);
    });

    test('price fetch failure offers a retry', async ({ page }) => {
        await signInAsStaff(page);
        await failureOffersRetry(page);
    });
});

test.describe('Public console experience', () => {
    test.skip(!CONSOLES_PUBLIC, `Las consolas están en modo ${CONSOLES_VISIBILITY}.`);

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
        expect(html).toContain('1.234 juegos compatibles');
    });

    test('packs narrow the offers and keep retired offers apart', async ({ page }) => comparePacks(page));
    test('the games counter links to the console gallery', async ({ page }) => gamesCounterLinksToTheGallery(page));
    test('a switcher leads to the other models of the console', async ({ page }) => switchesBetweenModels(page));
    test('pack selections without offers have an honest empty state', async ({ page }) => honestEmptyStates(page));
    test('global digital format does not hide physical console offers', async ({ page }) => hardwareIgnoresDigitalFormat(page));
    test('mobile navigation and filters fit the viewport', async ({ page }) => mobileFits(page));

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
    });

    test('price fetch failure offers a retry and console paths can be revalidated', async ({ page, request }) => {
        await failureOffersRetry(page);
        const revalidation = await request.post('/api/revalidate', { headers: { 'x-revalidate-token': 'console-test-token' },
            data: { paths: ['/consolas', '/consola/ps5-slim-981'] } });
        expect(revalidation.status()).toBe(200);
    });
});

test.describe('Consoles switched off', () => {
    test.skip(CONSOLES_VISIBILITY !== 'off', `Las consolas están en modo ${CONSOLES_VISIBILITY}.`);

    test('catalog and detail are real 404s and nothing links to them', async ({ request, page }) => {
        for (const path of ['/consolas', '/consola/ps5-slim-981']) {
            expect((await request.get(path)).status(), path).toBe(404);
        }
        for (const path of ['/search', '/store/77']) {
            await page.goto(path);
            await expect(page.locator('a[href^="/consola"]')).toHaveCount(0);
        }
    });
});
