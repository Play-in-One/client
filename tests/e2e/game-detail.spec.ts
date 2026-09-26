import { test, expect } from '@playwright/test';
import { SEEDED, seededGamePath } from './helpers';

/**
 * La ficha se resuelve en el SERVIDOR (`app/juego/[slug]/page.tsx`) y
 * `GameDetailClient` pinta el prop que recibe, sin volver a pedir. Ese fetch
 * sale del contenedor de Next hacia `backend:8001`, así que `page.route` no
 * puede verlo: los mocks que había aquí no interceptaban nada y los tests
 * miraban, en realidad, el juego con id 1 de la base de desarrollo.
 *
 * Ahora trabajan contra `manage.py seed_e2e`, que siembra un juego con dos
 * ofertas —una nacional sin envío y una importada con envío y convenio— y otro
 * sin ninguna, para los estados vacíos.
 */

let gamePath: string;
let emptyGamePath: string;
let noHistoryGamePath: string;

test.beforeEach(async ({ page }) => {
    gamePath = await seededGamePath(page);
    emptyGamePath = await seededGamePath(page, SEEDED.emptyGameId);
    noHistoryGamePath = await seededGamePath(page, SEEDED.noHistoryGameId);
});

test('la página de detalle carga con el título del juego', async ({ page }) => {
    await page.goto(gamePath);
    await expect(page.getByRole('heading', { name: SEEDED.game })).toBeVisible();
});

test('muestra las calificaciones como gauges por fuente', async ({ page }) => {
    await page.goto(gamePath);

    await expect(page.getByText('Calificaciones', { exact: true })).toBeVisible();
    await expect(page.getByTestId('ratings-gauges')).toBeVisible();
    await expect(page.getByTestId('rating-gauge-average')).toBeVisible();
    await expect(page.getByTestId('rating-gauge-metacritic')).toBeVisible();
    await expect(page.getByTestId('rating-gauge-igdb')).toBeVisible();
    await expect(page.getByTestId('rating-gauge-steam')).toBeVisible();
    await expect(page.getByText('8.6/10', { exact: true })).toBeVisible();
    await expect(page.getByText('8.5/10', { exact: true }).first()).toBeVisible();
});

test('omite el gauge de la fuente ausente', async ({ page }) => {
    await page.goto(noHistoryGamePath);

    await expect(page.getByTestId('rating-gauge-metacritic')).toBeVisible();
    await expect(page.getByTestId('rating-gauge-steam')).toBeVisible();
    await expect(page.getByTestId('rating-gauge-igdb')).toHaveCount(0);
    await expect(page.getByText('7.5/10', { exact: true })).toBeVisible();
    await expect(page.getByText('8.5/10', { exact: true })).toBeVisible();
});

test('omite el bloque de calificaciones cuando no hay datos', async ({ page }) => {
    await page.goto(emptyGamePath);
    await expect(page.getByText('Calificaciones', { exact: true })).toHaveCount(0);
});

test('la tabla de productos muestra los vendedores y precios', async ({ page }) => {
    await page.goto(gamePath);
    // Acotado a la tabla: el nombre de la tienda se repite en la fila, en el
    // enlace y en el bloque de mejor precio.
    const tabla = page.getByRole('table');
    await expect(tabla.getByText(SEEDED.nationalSeller).first()).toBeVisible();
    await expect(tabla.getByText(SEEDED.internationalSeller).first()).toBeVisible();
    // Los precios también salen en el bloque de mejor precio y en las tarjetas
    // de "otros juegos", así que la comprobación va contra la tabla.
    await expect(tabla.locator('p:visible', { hasText: '$19.990' }).first()).toBeVisible();   // nacional, sin envío
    await expect(tabla.locator('p:visible', { hasText: '$23.481' }).first()).toBeVisible();   // importada, con envío y cupón
});

test('una oferta sin stock se muestra grisada al final, sin ganar por precio', async ({ page }) => {
    // `seed_e2e` agrega una tercera oferta (delisted) mas barata que las dos
    // vigentes, justo para probar que no le gana el "mejor precio" ni el orden.
    await page.goto(gamePath);
    const tabla = page.getByRole('table');
    const filas = tabla.getByRole('row');

    await expect(tabla.getByText('No actualizado · Sin stock')).toBeVisible();

    // La oferta sin stock es la mas barata ($1.990): si el orden fuera solo
    // por precio iria primera. Tiene que quedar despues de las dos vigentes.
    const count = await filas.count();
    const lastRowText = await filas.nth(count - 1).innerText();
    // `innerText` refleja el text-transform:uppercase del Badge de Mantine.
    expect(lastRowText.toLowerCase()).toContain('no actualizado · sin stock');
    expect(lastRowText).toContain('$1.990');
    // nth(0) es la fila de encabezado (Tienda & Producto / Precio / Estado);
    // la primera fila de datos es nth(1).
    const firstRowText = await filas.nth(1).innerText();
    expect(firstRowText.toLowerCase()).not.toContain('sin stock');

    // El precio de $1.990 (la oferta sin stock) no debe aparecer como "Mejor
    // Precio": ese bloque sigue mostrando la oferta nacional vigente.
    const mejorPrecio = page.getByText('Mejor Precio', { exact: false }).locator('..');
    await expect(mejorPrecio.getByText('$1.990')).toHaveCount(0);
});

test('el precio con envío y convenio ofrece un solo desglose combinado', async ({ page }) => {
    await page.goto(gamePath);
    // La importadora tiene envío y convenio, pero ambos usan el mismo ícono.
    const info = page.getByRole('button', { name: 'Ver desglose de envío y cupón' });
    await expect(info).toHaveCount(1);

    await info.click();
    const popover = page.getByRole('dialog', { name: 'Ver desglose de envío y cupón' });
    await expect(popover.getByText('Precio con el cupón PIO10; el envío se suma después.')).toBeVisible();
    await expect(popover.getByText(/\$14\.990/)).toBeVisible();  // precio en tienda
    await expect(popover.getByText(/\$9\.990/)).toBeVisible();   // envío promedio
    await expect(popover.getByText(/\$13\.491/)).toBeVisible();  // precio con cupón
    await expect(popover.getByText(/\$23\.481/)).toBeVisible();  // total tras cupón y envío
    await expect(popover.getByText(/\$1\.499/)).toBeVisible();   // ahorro
});

test('solo las tiendas internacionales se marcan con el globo', async ({ page }) => {
    await page.goto(gamePath);
    // Solo la importadora lleva el globo: lo nacional es el caso por defecto.
    await expect(page.getByRole('img', { name: 'Tienda internacional' })).toHaveCount(1);
});

test('los badges de condición se muestran', async ({ page }) => {
    /* Acotado a la TABLA de ofertas a propósito. Antes buscaba 'Nuevo' y
       'Usado' en toda la página, y como el navbar tenía un control con
       "Nuevos"/"Usados" el test pasaba por coincidencia de subcadena aunque la
       ficha no hubiera cargado: nunca llegó a mirar un badge. Al mover ese
       control al menú de preferencias quedó al descubierto. */
    await page.goto(gamePath);
    const tabla = page.getByRole('table');
    await expect(tabla.getByText('Nuevo', { exact: true })).toBeVisible();
    await expect(tabla.getByText('Usado', { exact: true })).toBeVisible();
});

test('el botón de ir a la tienda apunta a la URL del producto', async ({ page }) => {
    await page.goto(gamePath);
    const btn = page.getByRole('link', { name: /tienda|comprar/i }).first();
    const href = await btn.getAttribute('href');
    expect(href).toBeTruthy();
});

test('el historial de precio mínimo se muestra entre el mejor precio y la comparativa', async ({ page }) => {
    await page.goto(gamePath);
    const minHistory = page.getByRole('heading', { name: /historial de precio mínimo/i });
    const comparison = page.getByRole('heading', { name: /comparativa de precios/i });
    await expect(minHistory).toBeVisible();
    await expect(comparison).toBeVisible();

    const bestPrice = page.getByText(/mejor precio/i).first();
    const [historyBox, comparisonBox, bestPriceBox] = await Promise.all([
        minHistory.boundingBox(),
        comparison.boundingBox(),
        bestPrice.boundingBox(),
    ]);
    expect(historyBox!.y).toBeGreaterThan(bestPriceBox!.y);
    expect(historyBox!.y).toBeLessThan(comparisonBox!.y);
});

test('el historial sigue al filtro de condición sin recargar', async ({ page }) => {
    await page.goto(gamePath);
    const heading = page.getByRole('heading', { name: /historial de precio mínimo/i });
    await expect(heading).toBeVisible();

    // El Select de condición vive en la comparativa; el card del historial
    // debe reaccionar sin pedir datos nuevos (la serie viaja embebida).
    let apiCalls = 0;
    // El lookahead deja fuera `facets/`: sin él este contador tapa el mock de
    // facetas del beforeEach —Playwright evalúa las rutas en orden inverso al
    // registro— y el sidebar recibe la forma equivocada.
    await page.route(/\/api\/games\/(?!facets)/, (route) => {
        apiCalls += 1;
        route.continue();
    });
    await page.getByPlaceholder('Filtrar por estado').click();
    await page.getByRole('option', { name: 'Usado' }).click();

    await expect(heading).toBeVisible();
    expect(apiCalls).toBe(0);
});

test('la tabla ya no tiene la columna de tendencia por producto', async ({ page }) => {
    await page.goto(gamePath);
    await expect(page.getByRole('heading', { name: /comparativa de precios/i })).toBeVisible();
    // El unico grafico del detalle es el del minimo por consola; el historial
    // por oferta se retiro junto con su columna.
    await expect(page.getByRole('columnheader', { name: /tendencia/i })).toHaveCount(0);
});

test('el selector de rango recorta el eje sin pedir datos nuevos', async ({ page }) => {
    await page.goto(gamePath);
    const heading = page.getByRole('heading', { name: /historial de precio mínimo/i });
    await expect(heading).toBeVisible();

    // La serie completa ya viaja en el detalle: cambiar el rango es puro
    // recorte en el cliente y no debe disparar ninguna request.
    let apiCalls = 0;
    // El lookahead deja fuera `facets/`: sin él este contador tapa el mock de
    // facetas del beforeEach —Playwright evalúa las rutas en orden inverso al
    // registro— y el sidebar recibe la forma equivocada.
    await page.route(/\/api\/games\/(?!facets)/, (route) => {
        apiCalls += 1;
        route.continue();
    });
    // Mantine deja el <input type="radio"> visualmente oculto tras su label,
    // asi que el click va al label.
    await page.getByText('30d', { exact: true }).click();

    await expect(heading).toBeVisible();
    await expect(page.getByRole('radio', { name: '30d' })).toBeChecked();
    expect(apiCalls).toBe(0);
});

test('el historial muestra estado vacío sin datos suficientes', async ({ page }) => {
    // Un juego CON oferta pero sin serie: sin ofertas no hay consola, y sin
    // consola el card del historial no llega a pintarse.
    await page.goto(noHistoryGamePath);
    await expect(page.getByText(/aún no hay suficiente historial/i)).toBeVisible();
});

test('se muestra estado vacío cuando no hay productos', async ({ page }) => {
    await page.goto(emptyGamePath);
    await expect(page.getByRole('heading', { name: SEEDED.emptyGame })).toBeVisible();
    // La tabla se pinta vacía, con su propio aviso.
    await expect(
        page.getByText('No hay productos disponibles con estos filtros'),
    ).toBeVisible();
});
