import { test, expect } from '@playwright/test';

/* Los fixtures de plataforma llevan los campos que publica la API desde que el
   catálogo de consolas es único: `long_name` es el nombre largo —el que se lee
   de corrido— y `display_name` el abreviado. Sin `long_name`, todo lo que usa
   `platformLongName()` cae al abreviado y el sidebar dice "PS5" donde la app
   real dice "PlayStation 5". */
const MOCK_PLATFORMS = [
    { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5',
      long_name: 'PlayStation 5', family: 'playstation', order: 12 },
    { id: 2, name: 'switch', slug: 'switch', display_name: 'NS',
      long_name: 'Nintendo Switch', family: 'nintendo', order: 34 },
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
    await page.route(/\/api\/platforms\//, (route) =>
        route.fulfill({ json: { count: 2, next: null, previous: null, results: MOCK_PLATFORMS } })
    );
    await page.route(/\/api\/genres\//, (route) =>
        route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } })
    );
    await page.route(/\/api\/sellers\//, (route) =>
        route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } })
    );
    await page.route(/\/api\/games\//, (route) =>
        route.fulfill({ json: makeResults(2) })
    );
    // `**/api/games/**` engulle también /api/games/facets/, que devuelve otra
    // forma ({platforms, genres, sellers}). Sin este mock el sidebar recibía la
    // respuesta de juegos, `facets.platforms` quedaba undefined y la página
    // reventaba entera. Va DESPUÉS a propósito: Playwright evalúa las rutas en
    // orden inverso al registro, así que la última registrada es la que gana.
    await page.route(/\/api\/games\/facets\//, (route) =>
        route.fulfill({ json: { platforms: {}, genres: {}, sellers: {} } }));
});

test('la página de búsqueda carga con resultados', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText('Juego de Prueba 1')).toBeVisible();
});

test('los filtros de plataforma se muestran en el sidebar', async ({ page }) => {
    await page.goto('/search');
    // Por rol y nombre, no por texto suelto: "PS5" aparece cinco veces en la
    // página (navbar, sidebar, tarjetas) y `getByText` moría por strict mode.
    // El sidebar usa el nombre LARGO de la consola, que es el que se lee.
    await expect(page.getByRole('checkbox', { name: /PlayStation 5/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Nintendo Switch/ })).toBeVisible();
});

test('la URL con ?q= precarga el término de búsqueda', async ({ page }) => {
    await page.goto('/search?q=mario');
    // El buscador del Navbar comparte placeholder con el de la página y va
    // ANTES en el DOM, así que `.first()` comprobaba el equivocado —el del
    // navbar está vacío a propósito— y el test no podía pasar nunca.
    const search = page.getByRole('main').getByPlaceholder('Buscar juegos...');
    await expect(search).toHaveValue('mario', { timeout: 5000 });
});

test('la paginación aparece cuando hay más de 50 resultados', async ({ page }) => {
    // El lookahead deja fuera `facets/`: sin él este override tapa el mock
    // de facetas del beforeEach —Playwright evalúa las rutas en orden inverso
    // al registro— y el sidebar recibe la forma equivocada.
    await page.route(/\/api\/games\/(?!facets)/, (route) =>
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
