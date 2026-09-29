import { test, expect, type Page } from '@playwright/test';
import { SEEDED, seededGamePath } from './helpers';

/**
 * `/sagas` y `/saga/[slug]` se resuelven en el SERVIDOR: `page.route` no
 * puede interceptar ese fetch (mismo motivo que `game-detail.spec.ts`). Los
 * tests trabajan contra `manage.py seed_e2e`, que siembra una saga con dos
 * juegos calificados (8.0 y 6.0) para que el promedio sea exacto: 7.0.
 */

test('la tarjeta de la saga en /sagas tiene alto fijo, no muestra el nombre y trae 4 carátulas', async ({ page }) => {
    await page.goto('/sagas');

    // El nombre ya no es texto visible (el logo la identifica): se ubica la
    // tarjeta por el testid del gauge, que siempre está (calificado o no).
    const card = page.locator('a', { has: page.getByTestId(`rating-gauge-saga-${SEEDED.sagaSlug}`) });
    await expect(card).toBeVisible();
    await expect(card).not.toContainText(SEEDED.sagaName);
    await expect(card.getByText(`${SEEDED.sagaAvgRating.toFixed(1)}/10`)).toBeVisible();

    const box = await card.boundingBox();
    expect(box?.height).toBeGreaterThan(150);
    expect(box?.height).toBeLessThan(190);

    // 4 slots de carátula siempre, aunque la saga sembrada no tenga ninguna
    // imagen real (cae al mismo placeholder que el resto del catálogo).
    await expect(card.locator('img[src*="placeholder-game"]')).toHaveCount(4);
});

test('la ficha de saga muestra descripción al centro y el gauge sin banner', async ({ page }) => {
    await page.goto(`/saga/${SEEDED.sagaSlug}`);

    await expect(page.getByRole('heading', { name: SEEDED.sagaName })).toBeVisible();
    await expect(page.getByText(SEEDED.sagaDescription)).toBeVisible();
    await expect(page.getByTestId('rating-gauge-saga-average')).toBeVisible();
    await expect(page.getByText(`${SEEDED.sagaAvgRating.toFixed(1)}/10`)).toBeVisible();
    // Sin banner: no debe quedar ninguna imagen de fondo de la cabecera.
    await expect(page.locator('img[alt=""]')).toHaveCount(0);
});

test('la ficha de saga permite filtrar sus juegos por consola', async ({ page }) => {
    await page.goto(`/saga/${SEEDED.sagaSlug}`);

    // Los dos juegos de la saga están en PS5; solo el B además está en Switch.
    await expect(page.getByText(SEEDED.sagaGameA)).toBeVisible();
    await expect(page.getByText(SEEDED.sagaGameB)).toBeVisible();

    // `exact` importa: "Nintendo Switch" también casa con "Nintendo Switch 2".
    const switchCheckbox = page.getByRole('checkbox', { name: /Nintendo Switch \(/ });
    await switchCheckbox.click();
    await expect(page.getByText(SEEDED.sagaGameB)).toBeVisible();
    await expect(page.getByText(SEEDED.sagaGameA)).toBeHidden();

    // Volver a des-marcar restaura los dos juegos.
    await switchCheckbox.click();
    await expect(page.getByText(SEEDED.sagaGameA)).toBeVisible();
    await expect(page.getByText(SEEDED.sagaGameB)).toBeVisible();
});

test('la ficha del juego muestra el logo de su saga en la sección de información', async ({ page }) => {
    const gamePath = await seededGamePath(page, SEEDED.sagaGameAId);
    await page.goto(gamePath);

    // La tarjeta de información se duplica en el DOM (copia desktop fija +
    // copia mobile desplegable, una de las dos oculta por CSS): `.first()`
    // toma la visible en el viewport por defecto de los tests (desktop).
    const sagaLink = page.locator(`a[href="/saga/${SEEDED.sagaSlug}"]`).first();
    await expect(sagaLink).toBeVisible();
    await expect(sagaLink.getByAltText(`Logo de ${SEEDED.sagaName}`)).toBeVisible();
});

/** Carátulas visibles: las de la primera línea de la fila, si la fila se
 *  muestra. Las que no caben hacen wrap a una segunda línea que el
 *  `overflow: hidden` recorta. */
async function visibleCovers(page: Page): Promise<number> {
    const card = page.locator('a', { has: page.getByTestId(`rating-gauge-saga-${SEEDED.sagaSlug}`) });
    return card.getByTestId('saga-card-covers').evaluate((row) => {
        if (getComputedStyle(row).display === 'none') return 0;
        const slots = Array.from(row.children) as HTMLElement[];
        return slots.filter((slot) => slot.offsetTop === slots[0].offsetTop).length;
    });
}

// Con menos ancho la fila no cambia de forma: se caen primero las carátulas
// y después el gauge. El logo queda siempre.
for (const { width, covers, gauge } of [
    { width: 1280, covers: 4, gauge: true },
    { width: 768, covers: 3, gauge: true },
    { width: 390, covers: 0, gauge: true },
    { width: 360, covers: 0, gauge: false },
]) {
    test.describe(`/sagas a ${width}px`, () => {
        test.use({ viewport: { width, height: 844 } });

        test(`la tarjeta muestra ${covers} carátulas ${gauge ? 'y' : 'sin'} gauge, en una fila`, async ({ page }) => {
            await page.goto('/sagas');

            const gaugeEl = page.getByTestId(`rating-gauge-saga-${SEEDED.sagaSlug}`);
            const card = page.locator('a', { has: gaugeEl });
            await expect(card).toBeVisible();

            // Alto fijo a cualquier ancho y sin scroll horizontal.
            const box = await card.boundingBox();
            expect(box?.height).toBeGreaterThan(150);
            expect(box?.height).toBeLessThan(190);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            expect(overflow).toBeLessThanOrEqual(0);

            await expect.poll(() => visibleCovers(page)).toBe(covers);
            if (gauge) await expect(gaugeEl).toBeVisible();
            else await expect(gaugeEl).toBeHidden();
        });
    });
}

test.describe('vista mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('la tarjeta de información es desplegable y aparece bajo el nombre y las consolas', async ({ page }) => {
        const gamePath = await seededGamePath(page, SEEDED.sagaGameAId);
        await page.goto(gamePath);

        const nameHeading = page.getByRole('heading', { name: SEEDED.sagaGameA });
        await expect(nameHeading).toBeVisible();

        const details = page.locator('details').filter({ hasText: 'Información del juego' });
        await expect(details).toBeVisible();

        // Cerrada por defecto: el contenido existe en el HTML (un `<details>`
        // nativo nunca lo esconde de un crawler) pero no se pinta hasta abrir.
        const sagaLogo = details.getByAltText(`Logo de ${SEEDED.sagaName}`);
        await expect(sagaLogo).toBeHidden();
        await details.locator('summary').click();
        await expect(sagaLogo).toBeVisible();

        // Bajo el nombre y el selector de consola, no arriba (donde vivía
        // antes de moverse para mobile).
        const nameBox = await nameHeading.boundingBox();
        const detailsBox = await details.boundingBox();
        expect(detailsBox!.y).toBeGreaterThan(nameBox!.y);
    });
});
