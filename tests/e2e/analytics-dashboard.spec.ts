import { test, expect } from '@playwright/test';

/**
 * Dashboard interno de analítica.
 *
 * Sin sesión staff no hay nada que ver, así que estos tests cubren la barrera y
 * el render con datos simulados. Los mocks de `/api/analytics/*` sí funcionan
 * aquí (a diferencia de los del catálogo): la página es cliente puro y pide sus
 * datos desde el navegador, no por SSR.
 */

const TODAY = '2026-08-27';

const SUMMARY = {
    start: '2026-07-29',
    end: TODAY,
    rollup_ran_today: true,
    current: {
        visitors: 1500, visitors_new: 400, visits: 1800, page_views: 5200, bounces: 500,
        bounce_rate: 27.8, avg_visit_seconds: 195, game_views: 900, offer_clicks: 180,
        searches: 640, view_to_offer_rate: 20,
    },
    previous: {
        visitors: 1000, visitors_new: 300, visits: 1200, page_views: 3900, bounces: 400,
        bounce_rate: 33.3, avg_visit_seconds: 150, game_views: 700, offer_clicks: 100,
        searches: 500, view_to_offer_rate: 14.3,
    },
};

const TRAFFIC = {
    start: '2026-07-29', end: TODAY,
    series: [{
        date: TODAY, visitors: 120, visitors_known: 60, visitors_new: 30, visitors_returning: 30,
        visits: 140, page_views: 420, events: 700, bounces: 40, bounce_rate: 28.6,
        avg_visit_seconds: 190, desktop_visits: 90, mobile_visits: 45, tablet_visits: 5,
    }],
    totals: { visitors: 1500, visitors_new: 400, visits: 1800, page_views: 5200, avg_visit_seconds: 195 },
};

const FUNNEL = {
    start: '2026-07-29', end: TODAY,
    series: [{
        date: TODAY, game_clicks: 200, game_views: 150, offer_clicks: 30,
        searches: 90, game_saves: 12, view_to_offer_rate: 20,
    }],
    totals: {
        game_clicks: 1200, game_views: 900, offer_clicks: 180,
        searches: 640, game_saves: 70, view_to_offer_rate: 20,
    },
    top_games: [{ game: 42, name: 'Hollow Knight', views: 300, clicks: 400, offer_clicks: 90, saves: 20 }],
    top_sellers: [{ seller: 7, name: 'Tienda Ejemplo', offer_clicks: 120 }],
};

const SEARCH = {
    start: '2026-07-29', end: TODAY,
    top_queries: [{ query: 'zelda', searches: 220, avg_results: 12 }],
    zero_results: [{ query: 'silksong', searches: 44, avg_results: 0 }],
};

const RETENTION = {
    first_cohort: '2026-06-01',
    cohorts: [
        { cohort_week: '2026-08-17', week_offset: 0, visitors: 200, cohort_size: 200, rate: 100 },
        { cohort_week: '2026-08-17', week_offset: 1, visitors: 60, cohort_size: 200, rate: 30 },
    ],
};

async function mockAnalytics(page: import('@playwright/test').Page) {
    const routes: [string, unknown][] = [
        ['**/api/analytics/summary/**', SUMMARY],
        ['**/api/analytics/traffic/**', TRAFFIC],
        ['**/api/analytics/funnel/**', FUNNEL],
        ['**/api/analytics/search/**', SEARCH],
        ['**/api/analytics/retention/**', RETENTION],
    ];
    for (const [pattern, body] of routes) {
        await page.route(pattern, (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
        );
    }
}

/** Simula una sesión staff sembrando el token que lee AdminContext. */
async function signInAsStaff(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
        window.localStorage.setItem('pio_admin_token', 'token-de-prueba');
        window.localStorage.setItem('pio_admin_user', 'tester');
    });
}

test('sin sesión staff el panel no muestra ninguna métrica', async ({ page }) => {
    await mockAnalytics(page);
    await page.goto('/staff/analytics');

    await expect(page.getByText('Necesitas iniciar sesión')).toBeVisible();
    await expect(page.getByText('Visitantes únicos')).toHaveCount(0);
});

/** El Card del KPI con ese rótulo. Los porcentajes se repiten por la página,
 *  así que cada aserción se ancla a su tarjeta. */
function kpi(page: import('@playwright/test').Page, label: string) {
    return page.locator('.mantine-Card-root').filter({ hasText: label }).first();
}

test('con sesión staff muestra los KPIs y sus variaciones', async ({ page }) => {
    await signInAsStaff(page);
    await mockAnalytics(page);
    await page.goto('/staff/analytics');

    await expect(page.getByRole('heading', { name: 'Analítica', level: 1 })).toBeVisible();

    const visitors = kpi(page, 'Visitantes');
    await expect(visitors).toContainText('1.500');
    // 1500 frente a 1000 en el periodo anterior.
    await expect(visitors).toContainText('50%');

    await expect(kpi(page, 'Ficha → tienda')).toContainText('20%');
    await expect(kpi(page, 'Duración media')).toContainText('3m 15s');
    await expect(kpi(page, 'Clics a tienda')).toContainText('180');
});

test('los paneles de detalle se rellenan', async ({ page }) => {
    await signInAsStaff(page);
    await mockAnalytics(page);
    await page.goto('/staff/analytics');

    await expect(page.getByRole('link', { name: 'Hollow Knight' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'zelda' })).toBeVisible();
    // La búsqueda sin resultados es la señal más accionable del panel.
    await expect(page.getByRole('link', { name: 'silksong' })).toBeVisible();
    // Celda de la matriz: 60 de 200 volvieron una semana después. Se ancla al
    // panel porque la tabla de juegos también tiene una conversión del 30%.
    const retention = page.locator('.mantine-Card-root').filter({ hasText: 'Retención por cohorte' });
    await expect(retention.getByRole('cell', { name: '100%' })).toBeVisible();
    await expect(retention.getByRole('cell', { name: '30%' })).toBeVisible();
});

test('avisa cuando el agregado diario no ha corrido', async ({ page }) => {
    await signInAsStaff(page);
    await mockAnalytics(page);
    await page.route('**/api/analytics/summary/**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...SUMMARY, rollup_ran_today: false }),
        }),
    );

    await page.goto('/staff/analytics');

    // Sin este aviso, un rollup caído se lee como "hoy no hubo tráfico".
    await expect(page.getByText('Faltan los datos de hoy')).toBeVisible();
});

test('cambiar el rango vuelve a consultar', async ({ page }) => {
    await signInAsStaff(page);
    await mockAnalytics(page);
    const requested: string[] = [];
    page.on('request', (request) => {
        if (request.url().includes('/api/analytics/summary/')) requested.push(request.url());
    });

    await page.goto('/staff/analytics');
    await expect(page.getByRole('heading', { name: 'Analítica', level: 1 })).toBeVisible();
    await page.getByText('90 días').click();

    await expect.poll(() => requested.some((url) => url.includes('days=90'))).toBe(true);
});
