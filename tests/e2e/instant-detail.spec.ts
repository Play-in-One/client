import { test, expect, type Page } from '@playwright/test';
import { SEEDED } from './helpers';

/*
 * Ficha instantánea (ver `src/lib/navigationSeed.ts`): el clic en una tarjeta
 * pinta la ficha con los datos de la tarjeta ANTES de que responda el
 * servidor, y el relevo hacia el `loading.tsx`, el preview y la ficha completa
 * no mueve el título ni el precio.
 *
 * `page.route` no alcanza los fetch del servidor (ver CLAUDE.md), pero sí la
 * petición RSC del navegador: retrasarla 3 s reproduce una red lenta o un
 * backend frío. Trabaja contra `seed_e2e`.
 */

const RSC_DELAY_MS = 3000;

async function delayGameRsc(page: Page, pattern = /\/juego\/[^?]*\?.*_rsc=/) {
    await page.route(pattern, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, RSC_DELAY_MS));
        await route.continue();
    });
}

async function openSearch(page: Page) {
    await page.goto(`/search?q=${encodeURIComponent(SEEDED.game)}`);
    const card = page.locator(`a[href*="-${SEEDED.gameId}"]`).first();
    await expect(card).toBeVisible();
    // El overlay es un chunk aparte: se precarga al pasar sobre una tarjeta.
    // Se espera a que baje para no medir la compilación bajo demanda de
    // `next dev`, que no existe en producción.
    await card.hover();
    await page.waitForLoadState('networkidle');
    return card;
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    test(`el clic pinta la ficha con los datos de la tarjeta y el relevo no la mueve (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const card = await openSearch(page);
        await delayGameRsc(page);
        const price = (await card.locator('.pio-card-price').innerText()).trim();

        const clickedAt = Date.now();
        await card.click();
        const overlay = page.locator('[data-instant-detail="game"]');
        // Holgado para `next dev`, que compila el chunk del overlay al pedirlo;
        // lo que importa es que llegue ANTES que la respuesta retrasada.
        await expect(overlay).toBeVisible({ timeout: 2500 });
        expect(Date.now() - clickedAt).toBeLessThan(RSC_DELAY_MS);
        // Todavía en la galería: el servidor no respondió.
        await expect(page).toHaveURL(/\/search\?/);
        await expect(overlay.getByRole('heading', { level: 1, name: SEEDED.game })).toBeVisible();
        await expect(overlay.locator('[data-best-price-amount]')).toHaveText(price);

        await page.waitForTimeout(300); // el fundido de entrada desplaza 4 px
        const titleBefore = await overlay.getByRole('heading', { level: 1 }).boundingBox();
        const priceBefore = await overlay.locator('[data-best-price]').boundingBox();

        // Llega la respuesta: el overlay se retira y la ficha queda en su sitio.
        await expect(page).toHaveURL(new RegExp(`-${SEEDED.gameId}\\?platform=`), { timeout: 15_000 });
        await expect(overlay).toHaveCount(0);
        await expect(page.getByRole('table', { name: 'Comparativa de precios' })).toBeVisible({ timeout: 15_000 });
        const title = page.getByRole('heading', { level: 1, name: SEEDED.game });
        const titleAfter = await title.boundingBox();
        const priceAfter = await page.locator('[data-best-price]').first().boundingBox();
        expect(Math.abs(titleAfter!.y - titleBefore!.y)).toBeLessThanOrEqual(2);
        expect(Math.abs(titleAfter!.x - titleBefore!.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(priceAfter!.y - priceBefore!.y)).toBeLessThanOrEqual(4);
        expect(Math.abs(priceAfter!.height - priceBefore!.height)).toBeLessThanOrEqual(4);
    });
}

test('ctrl+clic abre la ficha en otra pestaña sin tapar la galería', async ({ page, context }) => {
    const card = await openSearch(page);
    const popup = context.waitForEvent('page');
    await card.click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] });
    await (await popup).close();
    await expect(page.locator('[data-instant-detail]')).toHaveCount(0);
    await expect(page).toHaveURL(/\/search\?/);
});

test('Escape mientras la ficha no responde retira el overlay y conserva el scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await page.goto('/');
    await page.goto(`/search?q=${encodeURIComponent(SEEDED.game)}`);
    const card = page.locator(`a[href*="-${SEEDED.gameId}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await delayGameRsc(page);
    await card.click();
    await expect(page.locator('[data-instant-detail="game"]')).toBeVisible({ timeout: 2500 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-instant-detail]')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

test('volver desde la ficha no deja el overlay puesto', async ({ page }) => {
    /* El scroll exacto de `/search` al volver NO se comprueba aquí: ya se
       perdía antes de la ficha instantánea (medido con la semilla apagada:
       281 → 468 px), y es un arreglo aparte. */
    await page.goto(`/search?q=${encodeURIComponent('E2E')}`);
    const card = page.locator(`a[href*="-${SEEDED.gameId}"]`).first();
    await card.click();
    await expect(page).toHaveURL(new RegExp(`-${SEEDED.gameId}`), { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1, name: SEEDED.game })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?/);
    await expect(page.locator('[data-instant-detail]')).toHaveCount(0);
    await expect(page.locator(`a[href*="-${SEEDED.gameId}"]`).first()).toBeVisible();
});

test('una carga directa de la ficha no usa semilla ni produce errores de hidratación', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error' && /hydrat/i.test(message.text())) errors.push(message.text());
    });
    await page.goto(`/juego/e2e-juego-de-prueba-${SEEDED.gameId}`);
    await expect(page.getByRole('heading', { level: 1, name: SEEDED.game })).toBeVisible();
    await expect(page.locator('[data-instant-detail]')).toHaveCount(0);
    await expect(page.locator('[data-seed-image]')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('una noticia pinta su cabecera en el clic y la página llega en el mismo sitio', async ({ page }) => {
    /* En un build de producción el artículo (ISR estático) ya está precargado
       y el clic lo abre completo sin pasar por el overlay: la semilla solo
       cubre el caso sin precarga, que es el de `next dev`. */
    test.skip(process.env.PLAYWRIGHT_PRODUCTION === '1', 'En producción el post llega precargado.');
    await page.goto('/blog');
    const card = page.locator('[data-post-card]').first();
    await expect(card).toBeVisible();
    const title = (await card.locator('p').nth(0).innerText()).trim();
    await card.hover();
    await page.waitForLoadState('networkidle');
    await delayGameRsc(page, /\/blog\/[^?]*\?.*_rsc=/);
    await card.click();
    const overlay = page.locator('[data-instant-detail="post"]');
    await expect(overlay).toBeVisible({ timeout: 2500 });
    await expect(overlay.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await page.waitForTimeout(300); // fundido de entrada
    const before = (await overlay.getByRole('heading', { level: 1 }).boundingBox())!;
    await expect(page).toHaveURL(/\/blog\/.+-\d+$/, { timeout: 15_000 });
    await expect(overlay).toHaveCount(0);
    const after = (await page.getByRole('heading', { level: 1, name: title }).boundingBox())!;
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2);
});

test('en producción una noticia precargada abre completa sin overlay', async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PRODUCTION !== '1', 'Next solo precarga en un build de producción');
    await page.goto('/blog');
    const card = page.locator('[data-post-card]').first();
    const title = (await card.locator('p').nth(0).innerText()).trim();
    await page.waitForLoadState('networkidle');
    await card.click();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({ timeout: 2000 });
    await expect(page.locator('[data-instant-detail]')).toHaveCount(0);
});
