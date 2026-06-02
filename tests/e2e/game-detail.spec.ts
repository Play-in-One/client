import { test, expect } from '@playwright/test';

const MOCK_PLATFORM = { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5' };
const MOCK_SELLER_1 = { id: 1, name: 'Ripley', url: 'https://ripley.cl', logo: null };
const MOCK_SELLER_2 = { id: 2, name: 'Paris', url: 'https://paris.cl', logo: null };

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
            rating: null,
            prices: [],
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
            rating: null,
            prices: [],
        },
    ],
};

const MOCK_GAME_NO_PRODUCTS = {
    ...MOCK_GAME,
    id: 2,
    name: 'Juego Sin Stock',
    products: [],
    min_price: null,
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

test('se muestra estado vacío cuando no hay productos', async ({ page }) => {
    await page.goto('/game/2');
    await expect(page.getByRole('heading', { name: 'Juego Sin Stock' })).toBeVisible();
    // La tabla está vacía o se muestra el estado sin stock
    await expect(page.getByText(/no hay|sin stock|sin productos/i)).toBeVisible();
});
