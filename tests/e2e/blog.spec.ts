import { test, expect } from '@playwright/test';

const MOCK_POSTS = {
    count: 2,
    next: null,
    previous: null,
    results: [
        {
            id: 1,
            title: 'Las mejores ofertas de junio',
            category: 'deals',
            description: 'Aprovecha estas increíbles ofertas de videojuegos este mes en Chile.',
            image: null,
            published_date: '2026-06-01T12:00:00Z',
        },
        {
            id: 2,
            title: 'Nuevo juego anunciado para PS5',
            category: 'news',
            description: 'Sony sorprende con un nuevo exclusivo para PlayStation 5.',
            image: null,
            published_date: '2026-05-28T09:00:00Z',
        },
    ],
};

test.beforeEach(async ({ page }) => {
    await page.route('**/api/posts/**', (route) => {
        const url = route.request().url();
        if (/\/posts\/1\//.test(url)) {
            route.fulfill({ json: MOCK_POSTS.results[0] });
        } else if (/\/posts\/2\//.test(url)) {
            route.fulfill({ json: MOCK_POSTS.results[1] });
        } else {
            route.fulfill({ json: MOCK_POSTS });
        }
    });
});

test('la página de blog carga los posts', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByText('Las mejores ofertas de junio')).toBeVisible();
    await expect(page.getByText('Nuevo juego anunciado para PS5')).toBeVisible();
});

test('los badges de categoría se muestran en cada post', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByText('deals')).toBeVisible();
    await expect(page.getByText('news')).toBeVisible();
});

test('hacer click en un post navega al detalle', async ({ page }) => {
    await page.goto('/blog');
    await page.getByText('Las mejores ofertas de junio').click();
    await expect(page).toHaveURL(/\/blog\/1/);
});

test('la página de detalle de post muestra el contenido', async ({ page }) => {
    await page.goto('/blog/1');
    await expect(page.getByRole('heading', { name: 'Las mejores ofertas de junio' })).toBeVisible();
    await expect(page.getByText('Aprovecha estas increíbles ofertas de videojuegos este mes en Chile.')).toBeVisible();
});

test('la página de detalle muestra el badge de categoría', async ({ page }) => {
    await page.goto('/blog/1');
    await expect(page.getByText('deals')).toBeVisible();
});
