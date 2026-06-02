import { test, expect } from '@playwright/test';

const MOCK_PLATFORMS = [
    { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5' },
    { id: 2, name: 'switch', slug: 'switch', display_name: 'Switch' },
];

const makeResults = (count: number) => ({
    count,
    next: count > 50 ? 'http://localhost:8001/api/games/?page=2' : null,
    previous: null,
    results: Array.from({ length: Math.min(count, 50) }, (_, i) => ({
        id: i + 1,
        name: `Juego de Prueba ${i + 1}`,
        description: null,
        developer: 'Estudio Test',
        release_date: null,
        platforms: [MOCK_PLATFORMS[0]],
        genres: [],
        image: null,
        rating: null,
        min_price: String(19990 + i * 1000),
    })),
});

test.beforeEach(async ({ page }) => {
    await page.route('**/api/platforms/**', (route) =>
        route.fulfill({ json: { count: 2, next: null, previous: null, results: MOCK_PLATFORMS } })
    );
    await page.route('**/api/genres/**', (route) =>
        route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } })
    );
    await page.route('**/api/sellers/**', (route) =>
        route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } })
    );
    await page.route('**/api/games/**', (route) =>
        route.fulfill({ json: makeResults(2) })
    );
});

test('la página de búsqueda carga con resultados', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText('Juego de Prueba 1')).toBeVisible();
});

test('los filtros de plataforma se muestran en el sidebar', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText('PS5')).toBeVisible();
    await expect(page.getByText('Switch')).toBeVisible();
});

test('la URL con ?q= precarga el término de búsqueda', async ({ page }) => {
    await page.goto('/search?q=mario');
    const inputs = page.getByRole('textbox');
    await expect(inputs.first()).toHaveValue('mario', { timeout: 5000 });
});

test('la paginación aparece cuando hay más de 50 resultados', async ({ page }) => {
    await page.route('**/api/games/**', (route) =>
        route.fulfill({ json: makeResults(120) })
    );
    await page.goto('/search');
    // Mantine Pagination renders buttons like "1", "2", "3"
    await expect(page.getByRole('button', { name: '2' })).toBeVisible({ timeout: 5000 });
});

test('la URL con ?platform= carga la búsqueda filtrada', async ({ page }) => {
    await page.goto('/search?platform=ps5');
    // La página carga (no error 404, no blank)
    await expect(page.getByText('Juego de Prueba 1')).toBeVisible();
});
