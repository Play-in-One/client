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

/* El fixture tiene que hablar el idioma de `AnalyticsSummary` (`lib/types.ts`),
   no uno parecido: `sessions` se llamaba `visitors` y `known_coverage` no
   existía. Con el nombre viejo, `AnalyticsClient` hacía
   `current.sessions.toLocaleString()` sobre `undefined` y la página entera
   reventaba — por eso caían los seis tests de este archivo, no solo el del KPI. */
const SUMMARY = {
    start: '2026-07-29',
    end: TODAY,
    rollup_ran_today: true,
    known_coverage: 62.5,
    current: {
        sessions: 1500, visitors_known: 900, visitors_new: 400, visits: 1800,
        page_views: 5200, bounces: 500, bounce_rate: 27.8, avg_visit_seconds: 195,
        game_views: 900, offer_clicks: 180, searches: 640, view_to_offer_rate: 20,
    },
    previous: {
        sessions: 1000, visitors_known: 600, visitors_new: 300, visits: 1200,
        page_views: 3900, bounces: 400, bounce_rate: 33.3, avg_visit_seconds: 150,
        game_views: 700, offer_clicks: 100, searches: 500, view_to_offer_rate: 14.3,
    },
};

const TRAFFIC = {
    start: '2026-07-29', end: TODAY,
    series: [{
        date: TODAY, sessions: 120, visitors_known: 60, visitors_new: 30, visitors_returning: 30,
        visits: 140, page_views: 420, events: 700, bounces: 40, bounce_rate: 28.6,
        avg_visit_seconds: 190, desktop_visits: 90, mobile_visits: 45, tablet_visits: 5,
    }],
    totals: { sessions: 1500, visitors_new: 400, visits: 1800, page_views: 5200, avg_visit_seconds: 195 },
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
    // `socials` es obligatorio en `FunnelReport`: el panel hace
    // `reports.funnel.socials.length` sin protección, así que omitirlo tumbaba
    // la página entera y no solo su bloque.
    socials: [{ network: 'instagram', clicks: 45 }, { network: 'tiktok', clicks: 12 }],
};

const SEARCH = {
    start: '2026-07-29', end: TODAY,
    top_queries: [{ query: 'zelda', searches: 220, avg_results: 12 }],
    zero_results: [{ query: 'silksong', searches: 44, avg_results: 0 }],
};

/* Matriz de actividad: madrugada vacía y pico el martes a las 21, para que el
   test compruebe que la hora punta sale del dato y no de un valor por defecto. */
const ACTIVITY = {
    start: '2026-07-29', end: TODAY,
    timezone: 'America/Santiago',
    matrix: Array.from({ length: 7 * 24 }, (_, index) => {
        const weekday = Math.floor(index / 24);
        const hour = index % 24;
        const events = hour < 7 ? 0 : (weekday === 1 && hour === 21 ? 90 : hour * 2);
        return { weekday, hour, events, visitors: Math.round(events / 3), avg_events: events / 4 };
    }),
    max_events: 90,
    by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, events: hour * 14 })),
    by_weekday: Array.from({ length: 7 }, (_, weekday) => ({ weekday, events: 300 })),
    peak: { weekday: 1, hour: 21, events: 90, visitors: 30, avg_events: 22.5 },
};

const RETENTION = {
    first_cohort: '2026-06-01',
    cohorts: [
        { cohort_week: '2026-08-17', week_offset: 0, visitors: 200, cohort_size: 200, rate: 100 },
        { cohort_week: '2026-08-17', week_offset: 1, visitors: 60, cohort_size: 200, rate: 30 },
    ],
};

/* `PerformancePanel` vive dentro del mismo panel y pide sus dos endpoints por
   su cuenta. Sin mockearlos, el token falso de `signInAsStaff` recibe un 403 del
   backend real y la excepción tumba TODA la página de analítica, no solo su
   pestaña: de ahí que fallaran los seis tests de este archivo. */
const PERFORMANCE = {
    start: '2026-07-29', end: TODAY,
    series: [],
    totals: { samples: 0 },
    by_path: [],
    raw_window_days: 45,
    truncated: false,
};

const SLOWEST = {
    start: '2026-07-29', end: TODAY,
    metric: 'lcp_ms',
    results: [],
};

// Los patrones son RegExp y no globs, y esa es la diferencia entre mockear y
// no mockear nada: un glob como "api/analytics/summary/" seguido de dos
// asteriscos NO casa "/api/analytics/summary/?days=30", porque los comodines de
// un glob recorren segmentos de ruta y la query string no lo es. Todas estas
// llamadas llevan "?days=", así que el mock entero era letra muerta: las
// peticiones salían al backend real, recibían un 403 —el token de
// signInAsStaff es de mentira— y la excepción tumbaba la página. Comprobado con
// una sonda: de tres patrones, sólo interceptó el que contemplaba la "?".
async function mockAnalytics(page: import('@playwright/test').Page) {
    const routes: [RegExp, unknown][] = [
        [/\/api\/analytics\/summary\//, SUMMARY],
        [/\/api\/analytics\/traffic\//, TRAFFIC],
        [/\/api\/analytics\/funnel\//, FUNNEL],
        [/\/api\/analytics\/search\//, SEARCH],
        [/\/api\/analytics\/retention\//, RETENTION],
        [/\/api\/analytics\/activity\//, ACTIVITY],
        // El lookahead evita que `performance/` se coma a `performance/slowest/`,
        // así el orden de registro deja de importar.
        [/\/api\/analytics\/performance\/(?!slowest)/, PERFORMANCE],
        [/\/api\/analytics\/performance\/slowest\//, SLOWEST],
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
    // Un KPI que sí existe en el panel: el assert anterior buscaba
    // "Visitantes únicos", un rótulo que no está en ninguna parte del código,
    // así que pasaba dijera lo que dijera la página.
    await expect(page.getByText('Sesiones')).toHaveCount(0);
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

    // "Sesiones", no "Visitantes": son navegadores distintos por día, no
    // personas, y el panel se renombró para dejar de mentir.
    const sessions = kpi(page, 'Sesiones');
    await expect(sessions).toContainText('1.500');
    // 1500 frente a 1000 en el periodo anterior.
    await expect(sessions).toContainText('50%');

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

test('el mapa de calor muestra la hora punta y rotula la zona horaria', async ({ page }) => {
    await signInAsStaff(page);
    await mockAnalytics(page);
    await page.goto('/staff/analytics');

    const panel = page.locator('.mantine-Card-root').filter({ hasText: 'Horarios de uso' });
    await expect(panel).toBeVisible();
    // La hora punta sale del dato, no de un valor por defecto.
    await expect(panel).toContainText('Martes a las 21:00');
    // Sin rotular la zona, un "pico a las 21" no significa nada.
    await expect(panel).toContainText('America/Santiago');
    // 7 filas de dias x 24 horas, celdas vacias incluidas.
    await expect(panel.getByText('Lun', { exact: true })).toBeVisible();
    await expect(panel.getByText('Dom', { exact: true })).toBeVisible();
});

test('el mapa de calor avisa cuando no hay actividad', async ({ page }) => {
    await signInAsStaff(page);
    await mockAnalytics(page);
    await page.route(/\/api\/analytics\/activity\//, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...ACTIVITY, max_events: 0, peak: null }),
        }),
    );

    await page.goto('/staff/analytics');

    const panel = page.locator('.mantine-Card-root').filter({ hasText: 'Horarios de uso' });
    await expect(panel).toContainText('Todavía no hay actividad');
    // No debe inventarse una hora punta sobre una matriz de ceros.
    await expect(panel).not.toContainText('Hora punta');
});

test('avisa cuando el agregado diario no ha corrido', async ({ page }) => {
    await signInAsStaff(page);
    await mockAnalytics(page);
    // RegExp, por lo mismo que arriba: el glob no cubre la query string. Va
    // después de mockAnalytics a propósito — Playwright evalúa las rutas en
    // orden inverso al de registro, así que la última gana.
    await page.route(/\/api\/analytics\/summary\//, (route) =>
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
