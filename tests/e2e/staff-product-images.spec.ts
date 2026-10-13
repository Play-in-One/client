import { test, expect, type Page } from '@playwright/test';
import { SEEDED, seededGamePath } from './helpers';

const label = 'Mostrar imágenes de productos';
const photo = '/placeholder-game.png';

async function staff(page: Page, enabled = false) {
    await page.addInitScript(({ enabled }) => {
        localStorage.setItem('pio_admin_token', 'preview-staff-token');
        localStorage.setItem('pio_admin_user', 'tester');
        if (localStorage.getItem('pio_staff_product_images') === null) localStorage.setItem('pio_staff_product_images', String(enabled));
    }, { enabled });
    await page.route(/\/api\/analytics\/games\/\d+\/clicks\//, route => route.fulfill({ json: {
        game_id: SEEDED.gameId, today: {}, last_7d: {}, last_30d: {}, products: {},
    } }));
}

async function openPreferences(page: Page, mobile = false) {
    await page.getByRole('button', { name: mobile ? 'Abrir menú' : 'Preferencias', exact: true }).click();
}

test('ordinary visitors never fetch previews or see the staff switch', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/games/product-previews/**', route => { calls++; return route.fulfill({ json: {} }); });
    await page.goto('/search');
    await openPreferences(page);
    await expect(page.getByLabel(label)).toHaveCount(0);
    await expect(page.locator('[data-product-image-grid]')).toHaveCount(0);
    expect(calls).toBe(0);
});

test('desktop switch batches cards, preserves four cells and remembers the preference', async ({ page }) => {
    await staff(page);
    const requests: URL[] = [];
    await page.route('**/api/games/product-previews/**', route => {
        expect(route.request().headers().authorization).toBe('Token preview-staff-token');
        const url = new URL(route.request().url());
        requests.push(url);
        return route.fulfill({ json: Object.fromEntries(url.searchParams.getAll('ids').map(id => [id, [
            { product_id: 10, image: '/logos/zelda.png' }, { product_id: 11, image: null },
            { product_id: 12, image: '/broken-product-image.png' },
        ]])) });
    });
    await page.goto('/search');
    await openPreferences(page);
    const toggle = page.getByLabel(label);
    await expect(toggle).not.toBeChecked();
    expect(requests).toHaveLength(0);
    await page.getByText(label, { exact: true }).click();
    await expect(toggle).toBeChecked();
    const grid = page.locator('[data-product-image-grid]').first();
    await expect(grid).toBeVisible();
    await expect(grid.locator(':scope > div')).toHaveCount(4);
    await expect(grid.locator('img')).toHaveCount(3);
    await expect(grid.locator('img').nth(1)).toHaveAttribute('src', /\/placeholder-game\.png$/);
    await expect(grid.locator('img').nth(2)).toHaveAttribute('src', /\/placeholder-game\.png$/);
    expect(requests[0].searchParams.getAll('ids').length).toBeGreaterThan(1);
    await page.keyboard.press('Escape');
    await expect(page.getByLabel(label)).toHaveCount(0);
    await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Solo esenciales', exact: true })).toHaveCount(0);
    await page.screenshot({ path: '/tmp/pio-preview-desktop.png' });
    await page.reload();
    await expect(grid).toBeVisible();
    await openPreferences(page);
    await expect(page.getByLabel(label)).toBeChecked();
    await page.getByText(label, { exact: true }).click();
    await expect(page.locator('[data-product-image-grid]')).toHaveCount(0);
});

test('mobile switch and cross-tab logout restore game covers immediately', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await staff(page);
    await page.route('**/api/games/product-previews/**', route => {
        const ids = new URL(route.request().url()).searchParams.getAll('ids');
        return route.fulfill({ json: Object.fromEntries(ids.map(id => [id, [{ product_id: 1, image: photo }]])) });
    });
    await page.goto('/search');
    await openPreferences(page, true);
    await page.getByText(label, { exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel(label)).toHaveCount(0);
    const grid = page.locator('[data-product-image-grid]').first();
    await expect(grid).toBeVisible();
    await expect(grid.locator(':scope > div')).toHaveCount(4);
    await expect(grid.locator('img')).toHaveCount(1);
    await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Solo esenciales', exact: true })).toHaveCount(0);
    await page.screenshot({ path: '/tmp/pio-preview-mobile.png' });
    const other = await context.newPage();
    await other.goto('/search');
    await other.evaluate(() => localStorage.setItem('pio_staff_product_images', 'false'));
    await expect(page.locator('[data-product-image-grid]')).toHaveCount(0);
    await other.evaluate(() => localStorage.setItem('pio_staff_product_images', 'true'));
    await expect(grid).toBeVisible();
    await other.evaluate(() => localStorage.removeItem('pio_admin_token'));
    await expect(page.locator('[data-product-image-grid]')).toHaveCount(0);
    await openPreferences(page, true);
    await expect(page.getByLabel(label)).toHaveCount(0);
});

for (const count of [0, 2, 4]) {
    test(`${count} products render the expected grid or cover`, async ({ page }) => {
        await staff(page, true);
        await page.route('**/api/games/product-previews/**', route => {
            const ids = new URL(route.request().url()).searchParams.getAll('ids');
            return route.fulfill({ json: Object.fromEntries(ids.map(id => [id, Array.from({ length: count }, (_, i) => ({ product_id: i + 1, image: photo }))])) });
        });
        await page.goto('/search');
        if (count === 0) {
            await expect(page.getByRole('heading', { name: 'Explorar Juegos' })).toBeVisible();
            await expect(page.locator('[data-product-image-grid]')).toHaveCount(0);
        } else {
            const grid = page.locator('[data-product-image-grid]').first();
            await expect(grid).toBeVisible();
            await expect(grid.locator(':scope > div')).toHaveCount(4);
            await expect(grid.locator('img')).toHaveCount(count);
            await grid.locator('img').first().click();
            await expect(page).toHaveURL(/\/juego\//);
        }
    });
}

test('API failure and invalid session fall back to covers', async ({ page }) => {
    await staff(page, true);
    await page.route('**/api/games/product-previews/**', route => route.fulfill({ status: 403, json: { detail: 'Invalid token' } }));
    await page.goto('/search');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('pio_admin_token'))).toBeNull();
    await expect(page.locator('[data-product-image-grid]')).toHaveCount(0);
});

test('home, deals, catalog and saved cards use the same preview renderer', async ({ page }) => {
    await staff(page, true);
    const requests: URL[] = [];
    await page.addInitScript(({ id }) => localStorage.setItem('pio_saved_games', JSON.stringify([{ id, savedAt: '2026-10-12T12:00:00Z' }])), { id: SEEDED.gameId });
    await page.route('**/api/games/product-previews/**', route => {
        const url = new URL(route.request().url()); requests.push(url);
        return route.fulfill({ json: Object.fromEntries(url.searchParams.getAll('ids').map(id => [id, [{ product_id: 1, image: photo }]])) });
    });
    await page.goto('/');
    await expect(page.locator('[data-product-image-grid]').first()).toBeVisible();
    await page.goto('/ofertas/ps5');
    await expect(page.locator('[data-deal-card] [data-product-image-grid]').first()).toBeVisible();
    expect(requests.some(url => url.searchParams.get('platform') === 'ps5' || url.searchParams.getAll('platforms').length > 0)).toBe(true);
    await page.goto('/juegos/ps5');
    await expect(page.locator('[data-product-image-grid]').first()).toBeVisible();
    await page.goto('/saved');
    await expect(page.locator(`[data-product-image-grid="${SEEDED.gameId}"]`)).toBeVisible();
    await page.goto(await seededGamePath(page));
    await expect(page.getByRole('heading', { name: SEEDED.game, exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: SEEDED.game, exact: true }).first()).toBeVisible();
});

test('multiple console filters reach the batch API and images remain selectable for merging', async ({ page }) => {
    await staff(page, true);
    const response = await page.request.get(`${process.env.NEXT_PUBLIC_API_URL}/platforms/`);
    const platforms = (await response.json()).results.filter((platform: { slug: string }) => ['ps5', 'switch'].includes(platform.slug));
    await page.route(/\/api\/platforms\//, route => route.fulfill({ json: { count: 2, results: platforms } }));
    await page.route(/\/api\/games\/(\?.*)?$/, route => route.fulfill({ json: { count: 1, results: [{
        id: SEEDED.gameId, name: SEEDED.game, image: photo, platforms, genres: [],
        min_price: '100', min_price_base: '100', min_price_shipping: '0', min_price_platform: 'ps5',
    }] } }));
    await page.route(/\/api\/games\/facets\//, route => route.fulfill({ json: { platforms: {}, genres: {}, sellers: {} } }));
    const requests: URL[] = [];
    await page.route('**/api/games/product-previews/**', route => {
        const url = new URL(route.request().url()); requests.push(url);
        return route.fulfill({ json: { [SEEDED.gameId]: [{ product_id: 1, image: photo }] } });
    });
    await page.goto('/search?platform=ps5,switch');
    const grid = page.locator(`[data-product-image-grid="${SEEDED.gameId}"]`);
    await expect(grid).toBeVisible();
    await expect.poll(() => requests.at(-1)?.searchParams.getAll('platforms').sort()).toEqual(platforms.map((platform: { id: number }) => String(platform.id)).sort());
    await page.getByRole('button', { name: 'Fusionar juegos', exact: true }).click();
    await grid.locator('img').first().click();
    await expect(page.getByRole('button', { name: 'Cancelar selección', exact: true })).toBeVisible();
    await expect(grid.locator('..').getByRole('checkbox')).toBeChecked();
    await expect(page).toHaveURL(/\/search\?/);
});
