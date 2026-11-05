import { test, expect, type Page } from '@playwright/test';
import { buildConsent } from '../../src/lib/consent';
import { CONSOLES_PUBLIC, CONSOLES_STAFF_PREVIEW, CONSOLES_VISIBILITY } from '../../src/lib/features';

/* Runs with `npm run test:consoles` against `tests/fixtures/console-api.mjs`.
   Model 981 has five configurations: 11 (Estándar, 1 TB, no game: a live and a
   retired offer), 12 (Azul, 2 TB, a linked and an unlinked game: a used offer,
   the cheapest), 13 (Estándar, 1 TB, one game: a live offer), 14 and 15 (no
   offers). Only the describe for the current CONSOLES_VISIBILITY runs. */

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
/** Picks an option of one of the offer filters (Mantine Select). */
async function choose(page: Page, filter: string, option: string) {
    await page.getByRole('group', { name: 'Filtros de ofertas' }).getByRole('textbox', { name: filter, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

/* The filters and the offer list are shared by both visible modes. */
async function filtersNarrowTheOffers(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    await expect(page.getByRole('heading', { name: 'PS5 Slim', exact: true })).toBeVisible();
    await expect(offers(page)).toHaveCount(4);
    await expect(page.locator('[data-console-minimum]')).toContainText('453.000');
    await expect(page.locator('[data-stock="false"]')).toContainText('Oferta agotada');
    await expect(page.locator('[data-stock="false"]').getByRole('link', { name: 'Ver en tienda' })).toHaveCount(0);

    await choose(page, 'Capacidad', '1 TB');
    await expect(page).toHaveURL(/storage_gb=1000/);
    await expect(offers(page)).toHaveCount(3);
    await expect(page.locator('[data-console-minimum]')).toContainText('503.000');
    await expect(page.getByText('Mejor precio con estos filtros')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Capacidad', exact: true })).toHaveValue('1 TB');
    await expect(offers(page)).toHaveCount(3);

    await choose(page, 'Edición o color', 'Azul');
    await expect(page.getByText('No hay ofertas para esta selección.')).toBeVisible();
    await expect(page.locator('[data-console-minimum]')).toContainText('Sin precio disponible');
    await page.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(offers(page)).toHaveCount(4);
    await expect(page).not.toHaveURL(/storage_gb|edition/);
}

/* A colour is an edition: it sorts after Estándar and shows its swatch. */
async function colourEditionsShowTheirColour(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    await expect(offers(page).filter({ hasText: 'PS5 Slim Azul pack 2 TB' }).locator('[data-edition-swatch="azul"]')).toHaveCount(1);
    await expect(offers(page).filter({ hasText: 'PS5 Slim 1 TB' }).locator('[data-edition-swatch]')).toHaveCount(0);
    await page.getByRole('group', { name: 'Filtros de ofertas' }).getByRole('textbox', { name: 'Edición o color', exact: true }).click();
    await expect(page.getByRole('option')).toHaveText(['Todas', 'Estándar', 'Azul']);
    await page.getByRole('option', { name: 'Azul', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Filtros de ofertas' }).locator('[data-edition-swatch="azul"]')).toHaveCount(1);
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

/* Other filters load: their price and offers are skeletons, never the previous ones. */
async function skeletonsWhileOtherFiltersLoad(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    await expect(offers(page)).toHaveCount(4);
    await page.route(/\/api\/consoles\/981\//, async route => { await new Promise(r => setTimeout(r, 1200)); await route.continue(); });
    await choose(page, 'Capacidad', '1 TB');
    await expect(page.locator('[data-console-offer-skeleton]').first()).toBeVisible();
    await expect(page.locator('[data-best-price-skeleton]')).toBeVisible();
    await expect(offers(page)).toHaveCount(3);
    await expect(page.locator('[data-console-offer-skeleton]')).toHaveCount(0);
}

/* Configuration 12 includes a linked game (cover, canonical link) and an unlinked one (neutral tile). */
async function offersShowIncludedGameCovers(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    const row = offers(page).filter({ hasText: 'PS5 Slim Azul pack 2 TB' });
    await expect(row.getByRole('link', { name: 'Juego de aventura · Código' })).toHaveAttribute('href', '/juego/juego-de-aventura-501');
    await expect(row.getByRole('link', { name: 'Juego de aventura · Código' }).locator('img')).toHaveCount(1);
    await expect(row.getByRole('img', { name: 'Juego de carreras · Físico' })).toBeVisible();
    // An offer without games shows no covers.
    await expect(offers(page).filter({ hasText: 'PS5 Slim 1 TB' }).locator('[data-included-games]')).toHaveCount(0);
}

/* "Juego incluido" filters by one linked game or by "no game"; empty selections say so. */
async function includedGameFilterAndEmptyStates(page: Page) {
    await page.goto('/consola/ps5-slim-981');
    await choose(page, 'Juego incluido', 'Juego de aventura');
    await expect(page).toHaveURL(/game=501/);
    await expect(offers(page)).toHaveCount(1);
    await expect(offers(page)).toContainText('Juego de aventura + Juego de carreras');
    await segment(page, 'Condición', 'Nuevo').click();
    await expect(page.getByText('No hay ofertas para esta selección.')).toBeVisible();
    await expect(page.locator('[data-console-minimum]')).toContainText('Sin precio disponible');
    await choose(page, 'Juego incluido', 'Sin juego');
    await expect(page).toHaveURL(/has_game=false/);
    await expect(page).not.toHaveURL(/game=501/);
    await expect(offers(page)).toHaveCount(2);
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
        await expect(card).toContainText('1 tienda');
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

    test('filters narrow the offers and keep retired offers apart', async ({ page }) => {
        await signInAsStaff(page);
        await filtersNarrowTheOffers(page);
    });

    test('the games counter links to the console gallery', async ({ page }) => {
        await signInAsStaff(page);
        await gamesCounterLinksToTheGallery(page);
    });

    test('colour editions show their colour', async ({ page }) => {
        await signInAsStaff(page);
        await colourEditionsShowTheirColour(page);
    });

    test('a switcher leads to the other models of the console', async ({ page }) => {
        await signInAsStaff(page);
        await switchesBetweenModels(page);
    });

    test('offers show the covers of their included games', async ({ page }) => {
        await signInAsStaff(page);
        await offersShowIncludedGameCovers(page);
    });

    test('the first load and other filters show skeletons', async ({ page }) => {
        await signInAsStaff(page);
        await page.route(/\/api\/consoles\/981\//, async route => { await new Promise(r => setTimeout(r, 1200)); await route.continue(); });
        await page.goto('/consola/ps5-slim-981');
        await expect(page.locator('[data-console-detail-skeleton]')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'PS5 Slim', exact: true })).toBeVisible();
        await page.unrouteAll();
        await skeletonsWhileOtherFiltersLoad(page);
    });

    test('offers open the store directly, since /go cannot see drafts', async ({ page }) => {
        await signInAsStaff(page);
        await page.goto('/consola/ps5-slim-981');
        const exits = page.locator('[data-console-offer] a[target="_blank"]');
        await expect(exits.first()).toHaveAttribute('href', /^https:\/\/example\.com\//);
        await expect(page.locator('a[href*="/go/product/"]')).toHaveCount(0);
    });

    test('the included game filter and honest empty states', async ({ page }) => {
        await signInAsStaff(page);
        await includedGameFilterAndEmptyStates(page);
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

    test('filters narrow the offers and keep retired offers apart', async ({ page }) => filtersNarrowTheOffers(page));
    test('the games counter links to the console gallery', async ({ page }) => gamesCounterLinksToTheGallery(page));
    test('colour editions show their colour', async ({ page }) => colourEditionsShowTheirColour(page));
    test('a switcher leads to the other models of the console', async ({ page }) => switchesBetweenModels(page));
    test('other filters show skeletons', async ({ page }) => skeletonsWhileOtherFiltersLoad(page));
    test('offers show the covers of their included games', async ({ page }) => offersShowIncludedGameCovers(page));

    test('the server-rendered detail does not flash skeletons while it rechecks prices', async ({ page }) => {
        // The browser reloads the same query after hydration (the visitor's
        // preferences): the content stays, only the small loader shows.
        await page.route(/\/api\/consoles\/981\//, async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
        await page.goto('/consola/ps5-slim-981');
        await expect(offers(page)).toHaveCount(4);
        await page.waitForTimeout(600);
        await expect(page.locator('[data-console-offer-skeleton], [data-best-price-skeleton]')).toHaveCount(0);
        await expect(offers(page)).toHaveCount(4);
    });
    test('the included game filter and honest empty states', async ({ page }) => includedGameFilterAndEmptyStates(page));
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
