import { test, expect } from '@playwright/test';
import { SEEDED, COOKIE_DOMAIN, seededGamePath, serverHtml, robotsOf } from './helpers';

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
let thinGamePath: string;

test.beforeEach(async ({ page }) => {
    gamePath = await seededGamePath(page);
    emptyGamePath = await seededGamePath(page, SEEDED.emptyGameId);
    noHistoryGamePath = await seededGamePath(page, SEEDED.noHistoryGameId);
    thinGamePath = await seededGamePath(page, SEEDED.thinGameId);
});

/** La tabla de ofertas por su nombre: la ficha tiene además la de mínimos
 *  mensuales, y un `getByRole('table')` a secas ya no es único. */
const offersTable = (page: import('@playwright/test').Page) =>
    page.getByRole('table', { name: 'Comparativa de precios' });

test('la página de detalle carga con el título del juego', async ({ page }) => {
    await page.goto(gamePath);
    await expect(page.getByRole('heading', { name: SEEDED.game })).toBeVisible();
});

test('muestra las calificaciones como gauges por fuente', async ({ page }) => {
    await page.goto(gamePath);

    // La tarjeta de información se duplica en el DOM (copia desktop fija +
    // copia mobile desplegable, una de las dos oculta por CSS según el
    // viewport): `.first()` toma la visible, mismo criterio que ya usaba el
    // "8.5/10" de abajo por repetirse entre el promedio y una fuente.
    await expect(page.getByText('Calificaciones', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('ratings-gauges').first()).toBeVisible();
    await expect(page.getByTestId('rating-gauge-average').first()).toBeVisible();
    await expect(page.getByTestId('rating-gauge-metacritic').first()).toBeVisible();
    await expect(page.getByTestId('rating-gauge-igdb').first()).toBeVisible();
    await expect(page.getByTestId('rating-gauge-steam').first()).toBeVisible();
    await expect(page.getByText('8.6/10', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('8.5/10', { exact: true }).first()).toBeVisible();
});

test('«Acerca del juego» va dentro de la tarjeta de información, sin tarjeta aparte', async ({ page }) => {
    await page.goto(gamePath);

    // Desktop: la copia visible de la tarjeta de información (la fija de la
    // columna lateral) trae a la vez los datos del juego y la descripción.
    const about = page.getByText('Acerca del juego', { exact: true }).locator('visible=true');
    await expect(about).toHaveCount(1);
    const infoCard = page.locator('.mantine-Card-root', { has: about });
    await expect(infoCard.getByText('Calificaciones', { exact: true })).toBeVisible();
    await expect(infoCard.getByText(SEEDED.gameDescription)).toBeVisible();
});

test.describe('vista mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('«Acerca del juego» va dentro del desplegable, bajo el título', async ({ page }) => {
        await page.goto(gamePath);
        await expect(page.getByRole('heading', { name: SEEDED.game })).toBeVisible();

        // La tarjeta anida otro <details> (el resumen de precios), así que el
        // summary y la descripción se buscan en el nivel propio de la tarjeta.
        const details = page.locator('details').filter({ has: page.locator('> summary', { hasText: 'Información del juego' }) });
        const description = details.getByText(SEEDED.gameDescription);
        await expect(description).toBeHidden();
        // Un clic antes de hidratar puede perderse: se reintenta hasta que abra.
        await expect(async () => {
            if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
                await details.locator('> summary').click();
            }
            await expect(description).toBeVisible({ timeout: 1000 });
        }).toPass();
        await expect(details.getByText('Acerca del juego', { exact: true })).toBeVisible();
        await expect(description).toBeVisible();

        // Ya no queda una tarjeta suelta entre la carátula y el título: la
        // única descripción visible es la del desplegable.
        await expect(page.getByText(SEEDED.gameDescription).locator('visible=true')).toHaveCount(1);
        const titleBox = await page.getByRole('heading', { name: SEEDED.game }).boundingBox();
        const descriptionBox = await description.boundingBox();
        expect(descriptionBox!.y).toBeGreaterThan(titleBox!.y);
    });
});

test('omite el gauge de la fuente ausente', async ({ page }) => {
    await page.goto(noHistoryGamePath);

    await expect(page.getByTestId('rating-gauge-metacritic').first()).toBeVisible();
    await expect(page.getByTestId('rating-gauge-steam').first()).toBeVisible();
    await expect(page.getByTestId('rating-gauge-igdb')).toHaveCount(0);
    await expect(page.getByText('7.5/10', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('8.5/10', { exact: true }).first()).toBeVisible();
});

test('omite el bloque de calificaciones cuando no hay datos', async ({ page }) => {
    await page.goto(emptyGamePath);
    await expect(page.getByText('Calificaciones', { exact: true })).toHaveCount(0);
});

test('la tabla de productos muestra los vendedores y precios', async ({ page }) => {
    await page.goto(gamePath);
    // Acotado a la tabla: el nombre de la tienda se repite en la fila, en el
    // enlace y en el bloque de mejor precio.
    const tabla = offersTable(page);
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
    const tabla = offersTable(page);
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
    const info = offersTable(page).getByRole('button', { name: 'Ver desglose de envío y cupón' });
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
    const tabla = offersTable(page);
    // `.first()`: la nacional y la regional sembradas son ambas «Nuevo».
    await expect(tabla.getByText('Nuevo', { exact: true }).first()).toBeVisible();
    await expect(tabla.getByText('Usado', { exact: true }).first()).toBeVisible();
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

/* ── Lo que lee un crawler sin JavaScript ──────────────────────────────────
   GPTBot, ClaudeBot y PerplexityBot solo ven el HTML inicial. Estas pruebas
   leen ESE HTML (sin los <script>: el JSON-LD y el flight data de Next repiten
   el texto y darían un falso positivo) en vez de la página hidratada. */

test('el resumen de precios está en el HTML del servidor', async ({ request }) => {
    const html = await serverHtml(request, gamePath);
    expect(html).toContain('Resumen de precios');
    expect(html).toContain('precio más barato');
    // Plegado dentro de la tarjeta de información (`<details>` nativo): el
    // texto sigue en el HTML inicial aunque el bloque arranque cerrado.
    expect(html).toMatch(/<details class="pio-details">\s*<summary[^>]*>[\s\S]*?Resumen de precios/);
});

test('la tabla de mínimos mensuales aparece cuando hay historial de ≥2 meses', async ({ request }) => {
    const html = await serverHtml(request, gamePath);
    expect(html).toContain('Precio mínimo por mes');
    expect(html).toContain('Mínimo entre todas las consolas, envío incluido');
});

test('la valoración aparece como texto en el servidor', async ({ request }) => {
    const html = await serverHtml(request, gamePath);
    // Una línea por fuente, en su escala (el juego sembrado las trae en /100)...
    expect(html).toMatch(/Valoración [^<]+\/\d+/);
    // ...y el promedio normalizado a /10. `(?!\d)`: antes bastaba un «86/100»
    // de una fuente para satisfacer «/10» y el promedio podía faltar sin que
    // el test lo notara.
    expect(html).toMatch(/Promedio normalizado: [^<]+\/10(?!\d)/);
});

test('la tarjeta Mejor precio dice Último cambio de precio', async ({ request }) => {
    const html = await serverHtml(request, gamePath);
    expect(html).toContain('Último cambio de precio:');
    expect(html).not.toContain('Actualizado el');
});

test('los géneros enlazan', async ({ request }) => {
    const html = await serverHtml(request, gamePath);
    // El badge enlaza al género a secas; el «Ver más de …» de relacionados
    // lleva además `&platform=` y no debe bastar para pasar.
    expect(html).toMatch(/<a\b[^>]*href="\/search\?genre=\d+"/);
});

test('juegos relacionados enlazan a /juego/', async ({ request }) => {
    const html = await serverHtml(request, gamePath);
    const section = html.match(/<section\b[^>]*aria-labelledby="juegos-relacionados"[\s\S]*?<\/section>/)?.[0];
    expect(section, 'falta la sección de juegos relacionados').toBeTruthy();
    expect(section).toMatch(/href="\/juego\//);
    // El juego de la ficha no se recomienda a sí mismo.
    expect(section).not.toContain(`href="${gamePath}`);
});

test('con un filtro global activo, los relacionados se vuelven a pedir con él', async ({ page, context }) => {
    // El HTML del servidor sale sin filtrar (lo que lee un crawler); quien
    // apagó las tiendas nacionales no debe ver en las tarjetas un precio de
    // ellas, así que la grilla repite la consulta del servidor con el filtro.
    await context.addCookies([{
        name: 'pio_prefs',
        value: encodeURIComponent(JSON.stringify({ condition: 'all', national: false })),
        path: '/', domain: COOKIE_DOMAIN,
    }]);
    // La respuesta filtrada se retiene hasta haber comprobado que, mientras
    // tanto, la grilla NO enseña las tarjetas sin filtrar del servidor.
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let markRequested!: () => void;
    const requested = new Promise<void>((resolve) => { markRequested = resolve; });
    await page.route(/\/api\/games\/\?/, async (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.has('genres') && url.searchParams.has('seller_locations')) {
            markRequested();
            await held;
        }
        await route.continue();
    });
    await page.goto(gamePath);
    await requested;

    const section = page.locator('section[aria-labelledby="juegos-relacionados"]');
    await expect(section).toBeVisible();
    await expect(section.getByTestId('related-games-skeleton')).toBeVisible();
    await expect(section.locator('a[href^="/juego/"]')).toHaveCount(0);

    release();
    await expect(section.getByTestId('related-games-skeleton')).toHaveCount(0);
});

test('un juego delgado responde 200 con noindex', async ({ request }) => {
    const res = await request.get(thinGamePath, { headers: { 'User-Agent': 'GPTBot' } });
    expect(res.status()).toBe(200);
    expect(robotsOf(await res.text())).toContain('noindex');

    // El juego principal, con datos de sobra, sigue indexable.
    expect(robotsOf(await serverHtml(request, gamePath)) ?? '').not.toContain('noindex');
});
