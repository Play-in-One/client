import { test, expect } from '@playwright/test';

// El grafico usa una ventana relativa a hoy, asi que los timestamps del
// fixture tienen que serlo tambien: con fechas fijas el historial caduca y el
// test empieza a fallar solo por el paso del tiempo.
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const MOCK_PLATFORM = { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5' };
// Ripley importa y cobra despacho: su precio mostrado lleva el envio sumado
// y por eso su fila es la unica que ofrece el desglose.
const MOCK_SELLER_1 = {
    id: 1, name: 'Ripley', url: 'https://ripley.cl', logo: null,
    is_international: true, shipping_cost: '5000.00',
};
const MOCK_SELLER_2 = {
    id: 2, name: 'Paris', url: 'https://paris.cl', logo: null,
    is_international: false, shipping_cost: '0.00',
};

const MOCK_GAME = {
    id: 1,
    name: 'God of War Ragnarök',
    description: 'La saga continúa en los reinos nórdicos.',
    developer: 'Santa Monica Studio',
    release_date: '2022-11-09',
    platforms: [MOCK_PLATFORM],
    genres: [{ id: 1, name: 'Acción', slug: 'accion' }],
    image: null,
    rating: '9.5',
    min_price: '18990',
    min_price_base: '18990',
    min_price_shipping: '0.00',
    products: [
        {
            id: 10,
            title: 'God of War Ragnarök PS5 Nuevo',
            platform: MOCK_PLATFORM,
            url: 'https://ripley.cl/product/1',
            image: null,
            seller: MOCK_SELLER_1,
            condition: 'new',
            game: 1,
            current_price: '29990',
            base_price: '24990',
            shipping_cost: '5000.00',
            rating: null,
        },
        {
            id: 11,
            title: 'God of War Ragnarök PS5 Usado',
            platform: MOCK_PLATFORM,
            url: 'https://paris.cl/product/2',
            image: null,
            seller: MOCK_SELLER_2,
            condition: 'used',
            game: 1,
            current_price: '18990',
            base_price: '18990',
            shipping_cost: '0.00',
            rating: null,
        },
    ],
    // Serie del mínimo por consola: clave externa = Platform.name, interna =
    // condición ("" = agregada). price null marca un tramo sin stock.
    min_price_history: {
        ps5: {
            '': [
                { price: '18990.00', timestamp: daysAgo(3) },
                { price: null, timestamp: daysAgo(9) },
                { price: '24990.00', timestamp: daysAgo(15) },
                { price: '29990.00', timestamp: daysAgo(21) },
            ],
            used: [
                { price: '18990.00', timestamp: daysAgo(3) },
                { price: '21990.00', timestamp: daysAgo(15) },
            ],
        },
    },
};

const MOCK_GAME_NO_PRODUCTS = {
    ...MOCK_GAME,
    id: 2,
    name: 'Juego Sin Stock',
    products: [],
    min_price: null,
    min_price_history: {},
};

test.beforeEach(async ({ page }) => {
    await page.route('**/api/games/1/**', (route) =>
        route.fulfill({ json: MOCK_GAME })
    );
    await page.route('**/api/games/2/**', (route) =>
        route.fulfill({ json: MOCK_GAME_NO_PRODUCTS })
    );
    await page.route('**/api/products/**', (route) =>
        route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } })
    );
    // `**/api/games/**` engulle también /api/games/facets/, que devuelve otra
    // forma ({platforms, genres, sellers}). Sin este mock el sidebar recibía la
    // respuesta de juegos, `facets.platforms` quedaba undefined y la página
    // reventaba entera. Va DESPUÉS a propósito: Playwright evalúa las rutas en
    // orden inverso al registro, así que la última registrada es la que gana.
    await page.route('**/api/games/facets/**', (route) =>
        route.fulfill({ json: { platforms: {}, genres: {}, sellers: {} } }));
});

test('la página de detalle carga con el título del juego', async ({ page }) => {
    await page.goto('/game/1');
    await expect(page.getByRole('heading', { name: 'God of War Ragnarök' })).toBeVisible();
});

test('la tabla de productos muestra los vendedores y precios', async ({ page }) => {
    await page.goto('/game/1');
    await expect(page.getByText('Ripley')).toBeVisible();
    await expect(page.getByText('Paris')).toBeVisible();
    await expect(page.getByText(/\$29\.990/)).toBeVisible();
    await expect(page.getByText(/\$18\.990/)).toBeVisible();
});

test('el precio con envío ofrece el desglose y el sin envío no', async ({ page }) => {
    await page.goto('/game/1');
    // Un ícono por oferta con despacho: Ripley sí, Paris no.
    const info = page.getByRole('button', { name: 'Ver desglose del precio' });
    await expect(info).toHaveCount(1);

    await info.click();
    await expect(page.getByText('Este precio incluye el envío')).toBeVisible();
    await expect(page.getByText(/\$24\.990/)).toBeVisible();  // precio en tienda
    await expect(page.getByText(/\$5\.000/)).toBeVisible();   // envío promedio
});

test('solo las tiendas internacionales se marcan con el globo', async ({ page }) => {
    await page.goto('/game/1');
    // Ripley importa y Paris no: lo nacional es el caso por defecto y no se rotula.
    await expect(page.getByRole('img', { name: 'Tienda internacional' })).toHaveCount(1);
});

test('los badges de condición se muestran', async ({ page }) => {
    await page.goto('/game/1');
    await expect(page.getByText('Nuevo')).toBeVisible();
    await expect(page.getByText('Usado')).toBeVisible();
});

test('el botón de ir a la tienda apunta a la URL del producto', async ({ page }) => {
    await page.goto('/game/1');
    const btn = page.getByRole('link', { name: /tienda|comprar/i }).first();
    const href = await btn.getAttribute('href');
    expect(href).toBeTruthy();
});

test('el historial de precio mínimo se muestra entre el mejor precio y la comparativa', async ({ page }) => {
    await page.goto('/game/1');
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
    await page.goto('/game/1');
    const heading = page.getByRole('heading', { name: /historial de precio mínimo/i });
    await expect(heading).toBeVisible();

    // El Select de condición vive en la comparativa; el card del historial
    // debe reaccionar sin pedir datos nuevos (la serie viaja embebida).
    let apiCalls = 0;
    await page.route('**/api/games/**', (route) => {
        apiCalls += 1;
        route.continue();
    });
    await page.locator('input[value="Cualquier Estado"]').click();
    await page.getByRole('option', { name: 'Usado' }).click();

    await expect(heading).toBeVisible();
    expect(apiCalls).toBe(0);
});

test('la tabla ya no tiene la columna de tendencia por producto', async ({ page }) => {
    await page.goto('/game/1');
    await expect(page.getByRole('heading', { name: /comparativa de precios/i })).toBeVisible();
    // El unico grafico del detalle es el del minimo por consola; el historial
    // por oferta se retiro junto con su columna.
    await expect(page.getByRole('columnheader', { name: /tendencia/i })).toHaveCount(0);
});

test('el selector de rango recorta el eje sin pedir datos nuevos', async ({ page }) => {
    await page.goto('/game/1');
    const heading = page.getByRole('heading', { name: /historial de precio mínimo/i });
    await expect(heading).toBeVisible();

    // La serie completa ya viaja en el detalle: cambiar el rango es puro
    // recorte en el cliente y no debe disparar ninguna request.
    let apiCalls = 0;
    await page.route('**/api/games/**', (route) => {
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
    await page.goto('/game/2');
    await expect(page.getByText(/aún no hay suficiente historial/i)).toBeVisible();
});

test('se muestra estado vacío cuando no hay productos', async ({ page }) => {
    await page.goto('/game/2');
    await expect(page.getByRole('heading', { name: 'Juego Sin Stock' })).toBeVisible();
    // La tabla está vacía o se muestra el estado sin stock
    await expect(page.getByText(/no hay|sin stock|sin productos/i)).toBeVisible();
});
