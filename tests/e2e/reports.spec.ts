import { test, expect, type Page } from '@playwright/test';
import { seededGamePath } from './helpers';
import { CONSENT_COOKIE, buildConsent } from '../../src/lib/consent';

const DAY = '2026-10-07';
const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
};

test.beforeEach(async ({ page, context, baseURL }) => {
    await page.clock.install({ time: new Date(`${DAY}T15:00:00Z`) });
    await context.addCookies([{
        name: CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify(buildConsent('essential'))), url: baseURL!,
    }]);
});

async function mockSubmit(page: Page, status = 201) {
    const submissions: Record<string, unknown>[] = [];
    await page.route('**/api/reports/', route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        submissions.push(route.request().postDataJSON());
        return route.fulfill({ status, headers: CORS, json: { id: 1, date: DAY } });
    });
    return submissions;
}

test('portada: elegir un motivo no envía hasta confirmar y guarda el contexto mostrado', async ({ page }, testInfo) => {
    const submissions = await mockSubmit(page);
    await page.goto(await seededGamePath(page));
    const report = page.getByRole('button', { name: 'Reportar imagen', exact: true });
    await report.click();
    await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled();
    for (const label of ['No es la oficial', 'Es otro juego', 'No carga', 'Es de mala calidad']) {
        await expect(page.getByRole('radio', { name: label, exact: true })).toBeVisible();
    }
    await page.getByRole('radio', { name: 'No carga', exact: true }).check();
    await expect(page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Enviar', exact: true }) })).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath('game-report.png') });
    expect(submissions).toHaveLength(0);
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Reporte enviado');
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({ target_type: 'game', target_id: 999001, reason: 'image_not_loading' });
    expect(submissions[0].context).toHaveProperty('image_url');
    await expect(report).toBeDisabled();
    await page.reload();
    await expect(report).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reportar producto', exact: true }).first()).toBeEnabled();
});

test('productos: consola incorrecta está disponible y el bloqueo sincroniza oferta y fila', async ({ page, context }) => {
    const submissions = await mockSubmit(page);
    const shops: string[] = [];
    context.on('request', request => { if (new URL(request.url()).pathname.startsWith('/go/')) shops.push(request.url()); });
    await page.goto(await seededGamePath(page));
    const button = page.getByRole('button', { name: 'Reportar producto', exact: true }).first();
    const targetId = await button.getAttribute('data-report-target-id');
    await button.click();
    for (const label of ['Precio Incorrecto', 'Juego Incorrecto', 'Producto sin stock', 'Consola incorrecta']) {
        await expect(page.getByRole('radio', { name: label, exact: true })).toBeVisible();
    }
    await page.getByRole('radio', { name: 'Consola incorrecta', exact: true }).check();
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(button).toBeDisabled();
    expect(submissions[0]).toMatchObject({ target_type: 'product', target_id: Number(targetId), reason: 'console_incorrect' });
    const repeated = page.locator(`button[data-report-target-id="${targetId}"][data-report-target-type="product"]`);
    expect(await repeated.count()).toBeGreaterThan(1);
    for (const copy of await repeated.all()) await expect(copy).toBeDisabled();
    expect(shops).toHaveLength(0);
    await expect(page.getByRole('button', { name: 'Reportar imagen', exact: true })).toBeEnabled();
    await expect(page.locator(`button[data-report-target-type="product"]:not([data-report-target-id="${targetId}"])`).first()).toBeEnabled();
});

test('un fallo permite reintentar sin bloquear el elemento', async ({ page }) => {
    await mockSubmit(page, 503);
    await page.goto(await seededGamePath(page));
    const report = page.getByRole('button', { name: 'Reportar imagen', exact: true });
    await report.click();
    await page.getByRole('radio', { name: 'Es otro juego', exact: true }).check();
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo enviar' })).toBeVisible();
    await expect(report).toBeEnabled();
    const submissions = await mockSubmit(page);
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(report).toBeDisabled();
    expect(submissions).toHaveLength(1);
});

test('el bloqueo se renueva el siguiente día de Santiago y se sincroniza entre pestañas', async ({ page, context }) => {
    await mockSubmit(page);
    const path = await seededGamePath(page);
    await page.goto(path);
    const other = await context.newPage();
    await other.clock.install({ time: new Date(`${DAY}T15:00:00Z`) });
    await other.goto(path);
    await page.getByRole('button', { name: 'Reportar imagen', exact: true }).click();
    await page.getByRole('radio', { name: 'No es la oficial', exact: true }).check();
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(other.getByRole('button', { name: 'Reportar imagen', exact: true })).toBeDisabled();
    await other.clock.setSystemTime(new Date('2026-10-08T03:01:00Z'));
    await other.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(other.getByRole('button', { name: 'Reportar imagen', exact: true })).toBeEnabled();
});

test('sin almacenamiento disponible se bloquea durante la sesión', async ({ page }) => {
    await page.addInitScript(() => {
        const get = Storage.prototype.getItem;
        const set = Storage.prototype.setItem;
        Storage.prototype.getItem = function (key) {
            if (key.startsWith('pio:report:')) throw new Error('blocked');
            return get.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
            if (key.startsWith('pio:report:')) throw new Error('blocked');
            return set.call(this, key, value);
        };
    });
    await mockSubmit(page);
    await page.goto(await seededGamePath(page));
    const button = page.getByRole('button', { name: 'Reportar imagen', exact: true });
    await button.click();
    await page.getByRole('radio', { name: 'Es de mala calidad', exact: true }).check();
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(button).toBeDisabled();
});

test('el desplegable se cierra con Escape y contiene un icono SVG', async ({ page }) => {
    await page.goto(await seededGamePath(page));
    const button = page.getByRole('button', { name: 'Reportar imagen', exact: true });
    await expect(button.locator('svg')).toHaveCount(1);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('radio', { name: 'No carga', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('radio', { name: 'No carga', exact: true })).not.toBeVisible();
});

test('modal de cupón: permite reportar sin confirmar la salida', async ({ page, context }) => {
    const submissions = await mockSubmit(page);
    const shops: string[] = [];
    context.on('request', request => { if (new URL(request.url()).pathname.startsWith('/go/')) shops.push(request.url()); });
    await page.goto(await seededGamePath(page));
    const row = page.getByRole('row').filter({ hasText: 'E2E Importadora' });
    await row.locator('a[href^="/go/product/"]:visible').first().click();
    const modal = page.getByRole('dialog', { name: '¡Esta tienda tiene cupón!' });
    await modal.getByRole('button', { name: 'Reportar producto', exact: true }).click();
    await page.getByRole('radio', { name: 'Precio Incorrecto', exact: true }).check();
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Reporte enviado');
    expect(submissions).toHaveLength(1);
    expect(submissions[0].context).toHaveProperty('platform');
    expect(submissions[0].context).toHaveProperty('displayed_price');
    expect(shops).toHaveLength(0);
    await expect(modal).toBeVisible();
});

test.describe('móvil', () => {
    test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    test('reportar desde una fila no abre tienda ni desborda la pantalla', async ({ page, context }, testInfo) => {
        await mockSubmit(page);
        const shops: string[] = [];
        context.on('page', p => { shops.push(p.url()); });
        await page.goto(await seededGamePath(page));
        const row = page.getByRole('row').filter({ hasText: 'E2E Importadora' });
        await row.getByRole('button', { name: 'Reportar producto', exact: true }).locator('visible=true').tap();
        await page.getByRole('radio', { name: 'Producto sin stock', exact: true }).check();
        const send = page.getByRole('button', { name: 'Enviar', exact: true });
        await expect(page.getByRole('dialog').filter({ has: send })).toHaveCSS('opacity', '1');
        const box = await send.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(375);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(667);
        await page.screenshot({ path: testInfo.outputPath('product-report-mobile.png') });
        await send.tap();
        await expect(page.getByRole('status')).toContainText('Reporte enviado');
        expect(shops).toHaveLength(0);
        await expect(page.getByRole('dialog', { name: '¡Esta tienda tiene cupón!' })).not.toBeVisible();
    });
});

test('el panel requiere sesión de administrador', async ({ page }) => {
    await page.goto('/staff/reportes');
    await expect(page.getByText('Este panel es solo para administradores.')).toBeVisible();
});

test('el panel filtra reportes y permite marcar y desmarcar revisados', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('pio_admin_token', 'e2e-mock-token');
        localStorage.setItem('pio_admin_user', 'e2e');
    });
    let reviewed = false;
    const queries: string[] = [];
    const report = () => ({
        id: 1, target_type: 'product', target_id: 999, target_name: 'Producto de prueba',
        reason: 'console_incorrect', game: 999001, product: 999,
        snapshot: { title: 'Producto de prueba', seller: 'Tienda de prueba', platform_label: 'PS5',
            game_name: 'Juego de prueba', url: 'https://example.com/product', price: '19990.00' },
        context: {}, reviewed, created_at: '2026-10-07T15:00:00Z',
    });
    await page.route('**/api/reports/staff/**', async route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        if (route.request().method() === 'PATCH') {
            reviewed = route.request().postDataJSON().reviewed;
            return route.fulfill({ headers: CORS, json: report() });
        }
        queries.push(new URL(route.request().url()).search);
        return route.fulfill({ headers: CORS, json: { count: 1, next: null, previous: null, results: [report()] } });
    });
    await page.goto('/staff/reportes');
    await expect(page.getByText('Producto de prueba', { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Revisado: Producto de prueba' }).click();
    await expect(page.getByRole('checkbox', { name: 'Revisado: Producto de prueba' })).toBeChecked();
    await page.getByRole('checkbox', { name: 'Revisado: Producto de prueba' }).click();
    await expect(page.getByRole('checkbox', { name: 'Revisado: Producto de prueba' })).not.toBeChecked();
    await page.getByLabel('Buscar').fill('prueba');
    await expect.poll(() => queries.some(q => q.includes('search=prueba'))).toBe(true);
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    expect(queries.length).toBeGreaterThanOrEqual(2);
});

test('una escritura local fallida conserva el bloqueo aunque exista un reporte de ayer', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('pio:report:game:999001', '2026-10-06');
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key.startsWith('pio:report:')) throw new Error('quota exceeded');
            return original.call(this, key, value);
        };
    });
    await mockSubmit(page);
    await page.goto(await seededGamePath(page));
    const report = page.getByRole('button', { name: 'Reportar imagen', exact: true });
    await report.click();
    await page.getByRole('radio', { name: 'No carga', exact: true }).check();
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Reporte enviado');
    await expect(report).toBeDisabled();
});

test('dos pestañas que confirman mientras el primer envío sigue pendiente guardan un solo reporte', async ({ page, context }) => {
    let submissions = 0;
    let release!: () => void;
    const pendingResponse = new Promise<void>(resolve => { release = resolve; });
    await context.route('**/api/reports/', async route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        submissions++;
        await pendingResponse;
        await route.fulfill({ headers: CORS, json: { id: 1, date: DAY } });
    });
    const path = await seededGamePath(page);
    await page.goto(path);
    const other = await context.newPage();
    await other.clock.install({ time: new Date(`${DAY}T15:00:00Z`) });
    await other.goto(path);
    for (const tab of [page, other]) {
        await tab.getByRole('button', { name: 'Reportar imagen', exact: true }).click();
        await tab.getByRole('radio', { name: 'No carga', exact: true }).check();
    }
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect.poll(() => submissions).toBe(1);
    await other.getByRole('button', { name: 'Enviar', exact: true }).click();
    release();
    await expect(page.getByRole('button', { name: 'Reportar imagen', exact: true })).toBeDisabled();
    await expect(other.getByRole('button', { name: 'Reportar imagen', exact: true })).toBeDisabled();
    expect(submissions).toBe(1);
});

for (const changeFilter of [false, true]) {
test(changeFilter ? 'cambiar filtros durante una revisión no genera una página inválida' : 'revisar el último pendiente de la segunda página vuelve a la primera', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('pio_admin_token', 'e2e-mock-token');
        localStorage.setItem('pio_admin_user', 'e2e');
    });
    let count = 25;
    let releasePatch!: () => void;
    const patchWait = new Promise<void>(resolve => { releasePatch = resolve; });
    const queries: URL[] = [];
    const row = (id: number) => ({ id, target_type: 'game', target_id: id, target_name: `Reporte ${id}`,
        reason: 'image_not_loading', game: null, product: null, snapshot: {}, context: {}, reviewed: false,
        created_at: '2026-10-07T15:00:00Z' });
    await page.route('**/api/reports/staff/**', async route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        if (route.request().method() === 'PATCH') {
            if (changeFilter) await patchWait;
            count = 24;
            return route.fulfill({ headers: CORS, json: { ...row(25), reviewed: true } });
        }
        const url = new URL(route.request().url());
        queries.push(url);
        const second = url.searchParams.get('page') === '2';
        if (count === 24 && second) return route.fulfill({ status: 404, headers: CORS, json: { detail: 'Invalid page' } });
        return route.fulfill({ headers: CORS, json: { count, next: second ? null : 'next', previous: second ? 'previous' : null,
            results: second ? [row(25)] : Array.from({ length: 24 }, (_, i) => row(i + 1)) } });
    });
    await page.goto('/staff/reportes');
    await page.getByRole('textbox', { name: 'Estado', exact: true }).click();
    await page.getByRole('option', { name: 'Pendientes', exact: true }).click();
    await expect.poll(() => queries.at(-1)?.searchParams.get('reviewed')).toBe('false');
    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect(page.getByText('Reporte 25', { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Revisado: Reporte 25' }).click();
    if (changeFilter) {
        await page.getByRole('textbox', { name: 'Estado', exact: true }).click();
        await page.getByRole('option', { name: 'Todos', exact: true }).click();
        await expect.poll(() => queries.at(-1)?.searchParams.get('reviewed')).toBe(null);
        releasePatch();
    }
    await expect(page.getByText('24 reportes', { exact: true })).toBeVisible();
    await expect(page.getByText('Reporte 1', { exact: true })).toBeVisible();
    expect(queries.at(-1)?.searchParams.get('page')).toBe('1');
});
}

test('el formulario público guarda un reporte real en el backend', async ({ page }) => {
    await page.clock.setSystemTime(new Date());
    await page.goto(await seededGamePath(page));
    await page.getByRole('button', { name: 'Reportar imagen', exact: true }).click();
    await page.getByRole('radio', { name: 'Es otro juego', exact: true }).check();
    const submitted = page.waitForResponse(response => response.url().endsWith('/api/reports/') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const response = await submitted;
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ id: expect.any(Number), date: expect.any(String) });
    await expect(page.getByRole('status')).toContainText('Reporte enviado');
    await expect(page.getByRole('button', { name: 'Reportar imagen', exact: true })).toBeDisabled();
});
