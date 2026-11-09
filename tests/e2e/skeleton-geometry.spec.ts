import { test, expect } from '@playwright/test';
import { SEEDED } from './helpers';

/*
 * Un esqueleto mide lo mismo que el componente al que reemplaza. Los
 * esqueletos anteriores eran bloques con alturas a ojo: la tarjeta de juego
 * medía 70-115 px menos que la real y cada fila empujaba la página al llegar
 * los datos. Ahora se construyen con las mismas clases y tipografía
 * (`GameCardSkeleton`, `SkeletonLine`), y esto lo vigila.
 *
 * `/search` con búsqueda no trae resultados del servidor: los pide el
 * navegador, y esa petición sí se puede retrasar con `page.route`.
 */
for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 900 }]) {
    test(`la tarjeta en esqueleto mide lo que la real (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.route(/\/api\/games\/\?(?!.*facets).*search=/, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await route.continue();
        });
        await page.goto(`/search?q=${encodeURIComponent(SEEDED.game)}`);
        const skeleton = page.locator('[data-skeleton="game-card"]').first();
        await expect(skeleton).toBeVisible();
        const before = (await skeleton.boundingBox())!;

        const card = page.locator(`a[href*="-${SEEDED.gameId}"] .pio-game-card`).first();
        await expect(card).toBeVisible({ timeout: 15_000 });
        const after = (await card.boundingBox())!;

        expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
        /* El esqueleto reserva dos líneas de título (en una fila basta un
           nombre largo para que todas midan dos). Una tarjeta sola con un
           nombre corto puede medir una línea menos: ese es el único margen. */
        expect(before.height - after.height).toBeGreaterThanOrEqual(-2);
        expect(before.height - after.height).toBeLessThanOrEqual(26);
    });
}
