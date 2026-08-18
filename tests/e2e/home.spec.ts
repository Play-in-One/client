import { test, expect } from '@playwright/test';

const MOCK_PLATFORMS = [
    { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5' },
    { id: 2, name: 'switch', slug: 'switch', display_name: 'Switch' },
    { id: 3, name: 'xbox', slug: 'xbox', display_name: 'Xbox' },
];

const MOCK_GAMES = {
    count: 2,
    next: null,
    previous: null,
    results: [
        {
            id: 1,
            name: 'God of War Ragnarök',
            description: 'Aventura nórdica épica',
            developer: 'Santa Monica Studio',
            release_date: '2022-11-09',
            platforms: [MOCK_PLATFORMS[0]],
            genres: [{ id: 1, name: 'Acción', slug: 'accion' }],
            image: null,
            rating: '9.5',
            min_price: '29990',
        },
        {
            id: 2,
            name: 'The Legend of Zelda: Tears of the Kingdom',
            description: 'Aventura en Hyrule',
            developer: 'Nintendo',
            release_date: '2023-05-12',
            platforms: [MOCK_PLATFORMS[1]],
            genres: [{ id: 2, name: 'Aventura', slug: 'aventura' }],
            image: null,
            rating: '9.8',
            min_price: '44990',
        },
    ],
};

const MOCK_POSTS = {
    count: 1,
    next: null,
    previous: null,
    results: [
        {
            id: 1,
            title: 'Las mejores ofertas de junio',
            category: 'deals',
            description: 'Aprovecha estas ofertas increíbles este mes.',
            image: null,
            published_date: '2026-06-01T12:00:00Z',
        },
    ],
};

test.beforeEach(async ({ page }) => {
    await page.route('**/api/games/**', (route) =>
        route.fulfill({ json: MOCK_GAMES })
    );
    await page.route('**/api/posts/**', (route) =>
        route.fulfill({ json: MOCK_POSTS })
    );
    await page.route('**/api/platforms/**', (route) =>
        route.fulfill({ json: { count: 3, next: null, previous: null, results: MOCK_PLATFORMS } })
    );
});

test('la página de inicio carga con el título correcto', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Play in One|PIO/i);
});

test('el Navbar muestra los enlaces de plataforma', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('link', { name: 'PS5' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Switch' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Xbox' })).toBeVisible();
});

test('las tarjetas de juegos se muestran con precio en CLP', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('God of War Ragnarök')).toBeVisible();
    await expect(page.getByText('The Legend of Zelda: Tears of the Kingdom')).toBeVisible();
    await expect(page.getByText(/\$29\.990/)).toBeVisible();
});

test('la sección de blog preview muestra el post más reciente', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Las mejores ofertas de junio')).toBeVisible();
});

/* Regresión: el carrusel de Destacados usaba anchos fijos de desktop (carátula
   200px + info 320px = 520px) también en mobile, donde el slot mide bastante
   menos — la tarjeta activa desbordaba la pantalla y su animación terminaba
   fuera de lugar. En mobile la tarjeta debe caber en el ancho visible. */
test.describe('carrusel de Destacados en mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('la tarjeta destacada cabe en el ancho de la pantalla y no hay flechas', async ({ page }) => {
        await page.goto('/');
        const viewport = page.locator('.mantine-Carousel-viewport');
        await expect(viewport).toBeVisible();
        const carouselBox = await viewport.boundingBox();
        expect(carouselBox).not.toBeNull();

        const cards = page.locator('.mantine-Carousel-slide a > div');
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            const box = await cards.nth(i).boundingBox();
            if (!box) continue;
            expect(box.width).toBeLessThanOrEqual(carouselBox!.width + 1);
        }

        await expect(page.locator('.mantine-Carousel-control')).toHaveCount(0);
    });
});
