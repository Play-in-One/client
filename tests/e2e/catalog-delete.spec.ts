import { test, expect, type Page } from '@playwright/test';
import { POLICY_VERSION } from '../../src/lib/consent';
import { SEEDED, seededGamePath } from './helpers';
import type { Game, GameClickStats } from '../../src/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://pio.localhost:8080/api';

async function openGame(page: Page, staff = true) {
    await page.context().addCookies([{
        name: 'pio_consent',
        value: encodeURIComponent(JSON.stringify({
            v: POLICY_VERSION, analytics: false, measure: false, ads: false,
        })),
        url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    }]);
    if (staff) {
        await page.addInitScript(() => {
            localStorage.setItem('pio_admin_token', 'delete-test-token');
            localStorage.setItem('pio_admin_user', 'delete-staff');
        });
        const stats: GameClickStats = {
            game_id: SEEDED.gameId,
            today: { game_clicks: 0, offer_clicks: 0, conversion_rate: 0 },
            last_7d: { game_clicks: 0, offer_clicks: 0, conversion_rate: 0 },
            last_30d: { game_clicks: 0, offer_clicks: 0, conversion_rate: 0 },
            products: {},
        };
        await page.route('**/api/analytics/games/*/clicks/', (route) => route.fulfill({ json: stats }));
    }
    const path = await seededGamePath(page);
    const game: Game = await (await page.request.get(`${API_URL}/games/${SEEDED.gameId}/`)).json();
    await page.goto(path);
    return game;
}

async function openProductEditor(page: Page) {
    const row = page.getByRole('table', { name: 'Comparativa de precios' }).getByRole('row').filter({ hasText: SEEDED.nationalSeller }).first();
    await row.getByRole('button', { name: 'Editar producto', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar producto', exact: true }).click();
    return page.getByRole('dialog', { name: 'Eliminar producto', exact: true });
}

test('un visitante no tiene controles para borrar juegos o productos', async ({ page }) => {
    await openGame(page, false);
    await expect(page.getByRole('button', { name: 'Editar juego', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar producto', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Eliminar (juego|producto)/ })).toHaveCount(0);
});

test('staff cancela el borrado sin enviar DELETE', async ({ page }) => {
    await openGame(page);
    let writes = 0;
    await page.route('**/api/games/*/', (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        writes++;
        return route.fulfill({ status: 204 });
    });
    await page.getByRole('button', { name: 'Editar juego', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar juego', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Eliminar juego', exact: true });
    await expect(dialog.getByText(SEEDED.game, { exact: true })).toBeVisible();
    await expect(dialog).toContainText('productos asociados');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(writes).toBe(0);
    await expect(page.getByRole('heading', { name: SEEDED.game })).toBeVisible();
});

test('staff elimina un juego con respuesta vacía 204 y vuelve al catálogo', async ({ page }) => {
    await openGame(page);
    let writes = 0;
    await page.route(`**/api/games/${SEEDED.gameId}/`, (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        expect(route.request().headers().authorization).toBe('Token delete-test-token');
        writes++;
        return route.fulfill({ status: 204 });
    });
    await page.getByRole('button', { name: 'Editar juego', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar juego', exact: true }).click();
    await page.getByRole('dialog', { name: 'Eliminar juego' })
        .getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await expect(page).toHaveURL(/\/search$/);
    expect(writes).toBe(1);
});

test('staff elimina un producto y la fila desaparece inmediatamente', async ({ page }) => {
    const game = await openGame(page);
    const product = game.products!.find((p) => p.seller.name === SEEDED.nationalSeller)!;
    let writes = 0;
    await page.route(`**/api/products/${product.id}/`, (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        expect(route.request().headers().authorization).toBe('Token delete-test-token');
        writes++;
        return route.fulfill({ status: 204 });
    });
    const dialog = await openProductEditor(page);
    await expect(dialog.getByText(product.title, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('table', { name: 'Comparativa de precios' }).getByRole('row').filter({ hasText: product.title })).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Comparativa de precios' }).getByRole('row').filter({ hasText: SEEDED.internationalSeller })).toBeVisible();
    expect(writes).toBe(1);
});

test('un error de borrado conserva el producto y permite reintentar', async ({ page }) => {
    const game = await openGame(page);
    const product = game.products!.find((p) => p.seller.name === SEEDED.nationalSeller)!;
    await page.route(`**/api/products/${product.id}/`, (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        return route.fulfill({ status: 500, json: { detail: 'Internal server error' } });
    });
    const dialog = await openProductEditor(page);
    await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('No se pudo eliminar');
    await expect(dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Comparativa de precios' }).getByRole('row').filter({ hasText: product.title }).first()).toBeVisible();
});

test('si el producto ya fue borrado, se retira la fila ante un 404', async ({ page }) => {
    const game = await openGame(page);
    const product = game.products!.find((p) => p.seller.name === SEEDED.nationalSeller)!;
    await page.route(`**/api/products/${product.id}/`, (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        return route.fulfill({ status: 404, json: { detail: 'Not found' } });
    });
    const dialog = await openProductEditor(page);
    await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('table', { name: 'Comparativa de precios' }).getByRole('row').filter({ hasText: product.title })).toHaveCount(0);
});

test('la confirmación cabe en móvil y bloquea envíos repetidos', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openGame(page);
    let writes = 0;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    await page.route(`**/api/games/${SEEDED.gameId}/`, async (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        writes++;
        await pending;
        await route.fulfill({ status: 204 });
    });
    await page.getByRole('button', { name: 'Editar juego', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar juego', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Eliminar juego' });
    const confirm = dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true });
    await confirm.scrollIntoViewIfNeeded();
    const bounds = await confirm.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
    await confirm.click();
    try {
        await expect(confirm).toBeDisabled();
        await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
        await expect.poll(() => writes).toBe(1);
    } finally {
        finish();
    }
    await expect(page).toHaveURL(/\/search$/);
});
