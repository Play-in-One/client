import { test, expect } from '@playwright/test';
import { SEEDED } from './helpers';

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

test('con ?platform= no se pide el catálogo sin filtrar mientras se resuelve la consola', async ({ page }) => {
    // El slug de la URL se traduce a id con /api/platforms/, que el navegador
    // pide al montar. Llega tarde a propósito: en esa ventana la galería pedía
    // /games/ sin `platforms` y mostraba un instante todas las consolas.
    await page.route(/\/api\/platforms\//, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.fulfill({ json: { count: 2, next: null, previous: null, results: MOCK_PLATFORMS } });
    });
    const unfiltered: string[] = [];
    page.on('request', (req) => {
        const url = new URL(req.url());
        if (/\/api\/games\/(facets\/)?$/.test(url.pathname) && !url.searchParams.has('platforms')) {
            unfiltered.push(url.pathname + url.search);
        }
    });

    await page.goto('/search?platform=ps5');
    await expect(page.getByText('Juego de Prueba 1')).toBeVisible();
    expect(unfiltered).toEqual([]);
});

test('la página de búsqueda carga con resultados', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText('Juego de Prueba 1')).toBeVisible();
});

test('un juego sin ninguna oferta vigente se lista con el badge "Sin stock" y no aparece en Populares', async ({ page }) => {
    // Este caso NO se puede mockear: `/search` sin filtros toma el atajo de
    // "coincide con el estado por defecto" (ver GameExplorer.tsx) y no vuelve
    // a pedir /api/games/ en el cliente, así que un `page.route` nunca se
    // llega a invocar sobre un catálogo real con contenido. Se navega
    // directo con `?q=` — el mismo query param que usa el buscador visible
    // (`SearchContent`, `params.get('q')`) — al título exacto del juego
    // sembrado por `seed_e2e`, lo que fuerza un filtro real (no el default) y
    // por tanto un fetch real contra el backend de dev.
    //
    // Este SÍ es un fetch de cliente (a diferencia de `/search` sin filtros,
    // que lo resuelve el servidor), así que el mock genérico de `/api/games/`
    // del beforeEach lo intercepta y lo tapa con su catálogo falso. Se le
    // gana con un override registrado después (misma técnica que el resto
    // del archivo: Playwright evalúa en orden inverso al registro), pero
    // dejando pasar la petición real en vez de devolver otro mock.
    await page.route(/\/api\/games\/(?!facets)/, (route) => route.continue());
    await page.goto(`/search?q=${encodeURIComponent(SEEDED.outOfStockGame)}`);

    const card = page.locator('a', { hasText: SEEDED.outOfStockGame });
    await expect(card).toBeVisible();
    // Acotado a la tarjeta del juego: "Sin stock" a secas no es exclusivo de
    // ella (cualquier otro juego sin precio real en el catálogo de dev
    // también lo mostraría), así que se busca dentro del propio card.
    await expect(card.getByText('Sin stock', { exact: true })).toBeVisible();

    // El juego debe listarse (badge en vez de hueco) pero seguir fuera de
    // "Populares esta semana": esa sección de la home sigue la regla de
    // visibilidad antigua (Task 5 sólo amplió los destacados de saga), así
    // que nunca debería traer un juego sin oferta vigente.
    await page.goto('/');
    const popularesHeading = page.getByRole('heading', { name: 'Populares esta semana' });
    if (await popularesHeading.count() > 0) {
        const popularesSection = page.locator('.mantine-Container-root', { has: popularesHeading });
        await expect(popularesSection).not.toContainText(SEEDED.outOfStockGame);
    }
});

test('muestra las facetas mientras la petición de resultados sigue pendiente', async ({ page }) => {
    let releaseResults = () => {};
    const resultsPending = new Promise<void>((resolve) => { releaseResults = resolve; });
    let resultsRequested = false;
    let facetsRequestedBeforeResults = false;

    page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname.endsWith('/api/games/') && url.searchParams.get('search') === 'mario') {
            resultsRequested = true;
        }
        if (url.pathname.endsWith('/api/games/facets/') && url.searchParams.get('search') === 'mario' && resultsRequested) {
            facetsRequestedBeforeResults = true;
        }
    });
    await page.route(/\/api\/games\/(?!facets)/, async (route) => {
        await resultsPending;
        await route.fulfill({ json: makeResults(2) });
    });
    await page.route(/\/api\/games\/facets\//, (route) =>
        route.fulfill({ json: { platforms: { 1: 7 }, genres: {}, sellers: {} } }));

    try {
        await page.goto('/search?q=mario');
        await expect.poll(() => facetsRequestedBeforeResults).toBe(true);
        await expect(page.getByRole('checkbox', { name: /PlayStation 5 \(7\)/ }).first()).toBeVisible();
    } finally {
        releaseResults();
    }
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

test('conserva los juegos mientras cambia la consola y omite el conteo de tiendas', async ({ page }) => {
    const facetRequests: string[] = [];
    await page.route(/\/api\/games\/(?!facets)/, async (route) => {
        if (new URL(route.request().url()).searchParams.has('platforms')) {
            await new Promise((resolve) => setTimeout(resolve, 800));
        }
        await route.fulfill({ json: makeResults(2) });
    });
    page.on('request', (request) => {
        if (new URL(request.url()).pathname.endsWith('/api/games/facets/')) {
            facetRequests.push(request.url());
        }
    });

    await page.goto('/search');
    await expect(page.getByText('Juego de Prueba 1')).toBeVisible();
    await page.getByRole('checkbox', { name: /PlayStation 5/ }).first().click();
    await expect(page.getByText('Actualizando resultados...')).toBeVisible();
    await expect(page.getByText('Juego de Prueba 1')).toBeVisible();
    await expect(page.getByText('Actualizando resultados...')).toBeHidden();
    expect(facetRequests.length).toBeGreaterThan(0);
    expect(facetRequests.every((url) => new URL(url).searchParams.get('include_sellers') === '0')).toBe(true);
});

/* Con el admin de Django abierto en el mismo navegador, la cookie `sessionid`
   viajaba en cada fetch del catálogo y el backend autenticaba al visitante como
   staff, que ve los juegos sin oferta pública (ordenando por popularidad suben
   arriba por su tráfico histórico). Solo discrimina cuando el sitio y la API
   comparten origen, como en el stack dev (`pio.localhost:8080`); con orígenes
   distintos el navegador no manda la cookie de todos modos. */
test('la galería pide como anónimo aunque haya una sesión del admin abierta', async ({ page, context }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://pio.localhost:8080/api';
    await context.addCookies([{
        name: 'sessionid',
        value: 'sesion-del-admin',
        domain: new URL(apiUrl).hostname,
        path: '/',
    }]);
    const cookieHeaders: string[] = [];
    await page.route(/\/api\/games\//, async (route) => {
        cookieHeaders.push((await route.request().allHeaders())['cookie'] ?? '');
        await route.continue();
    });

    await page.goto('/search?ordering=-traffic_score');
    await expect.poll(() => cookieHeaders.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(cookieHeaders.filter((c) => c.includes('sessionid'))).toEqual([]);
});
