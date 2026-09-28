import { test, expect } from '@playwright/test';
import { SEEDED, seededGamePath } from './helpers';

/* La marca 💸 de "tienda afiliada" es solo para admins. `seed_e2e` deja en el
   juego sembrado una oferta de E2E Importadora, que tiene convenio con cupón:
   esa fila es de afiliada y la de la tienda nacional no. */
const IMPORTADORA = 'E2E Importadora';
const NACIONAL = 'E2E Tienda Nacional';

test('un visitante no ve la marca de tienda afiliada', async ({ page }) => {
    await page.goto(await seededGamePath(page));
    await expect(page.getByRole('heading', { name: SEEDED.game })).toBeVisible();
    await expect(page.getByTestId('affiliate-mark')).toHaveCount(0);
});

test('un admin ve 💸 solo en la fila de la tienda afiliada', async ({ page }) => {
    // AdminContext solo mira si hay token para decidir `isAdmin`, pero cierra
    // la sesión ante el primer 401: las métricas de clics de admin que pide la
    // ficha se simulan para que el token de prueba sobreviva.
    await page.addInitScript(() => {
        window.localStorage.setItem('pio_admin_token', 'token-de-prueba');
        window.localStorage.setItem('pio_admin_user', 'tester');
    });
    await page.route(/\/api\/analytics\/games\/\d+\/clicks\//, (route) => {
        const window = { game_clicks: 0, offer_clicks: 0, conversion_rate: 0 };
        return route.fulfill({
            json: { game_id: SEEDED.gameId, today: window, last_7d: window, last_30d: window, products: {} },
        });
    });
    await page.goto(await seededGamePath(page));

    // Acotado a las filas de ofertas: las tarjetas de "Otros juegos populares"
    // al pie de la ficha también pueden llevar la marca.
    const affiliateRow = page.locator('tr', { hasText: IMPORTADORA }).first();
    const nationalRow = page.locator('tr', { hasText: NACIONAL }).first();
    await expect(affiliateRow.getByTestId('affiliate-mark').filter({ visible: true })).toHaveCount(1);
    await expect(nationalRow).toBeVisible();
    await expect(nationalRow.getByTestId('affiliate-mark')).toHaveCount(0);
});
