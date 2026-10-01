import { test, expect } from '@playwright/test';
import { seededGamePath } from './helpers';
import { CONSENT_COOKIE, buildConsent } from '../../src/lib/consent';

test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify(buildConsent('essential'))), url: baseURL! }]);
    // A simulated shop prevents these tests from actually visiting a seller.
    await context.route('**/*', async route => {
        const req = route.request();
        if (new URL(req.url()).pathname.startsWith('/go/')) {
            // Execute the real redirect handler and event POST, replacing only
            // the final seller response. Playwright routes the first URL of a
            // redirect chain, so intercepting the seller alone is insufficient.
            const response = await route.fetch({ maxRedirects: 0 });
            expect(response.status()).toBe(302);
            expect(response.headers()['location']).toMatch(/^https?:\/\//);
            return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Tienda de prueba</h1>' });
        }
        if (req.isNavigationRequest() && new URL(req.url()).origin !== new URL(baseURL!).origin) {
            return route.fulfill({ contentType: 'text/html', body: '<h1>Tienda de prueba</h1>' });
        }
        return route.continue();
    });
});

for (const action of ['click', 'middle', 'keyboard'] as const) {
    test(`salida ${action} usa la redirección con campaña y no duplica el beacon`, async ({ page, context }) => {
        const go: string[] = [], beacons: string[] = [];
        context.on('request', req => {
            if (new URL(req.url()).pathname.startsWith('/go/')) go.push(req.url());
            if (req.method() === 'POST' && req.url().includes('/events/')) beacons.push(req.postData() ?? '');
        });
        await page.goto(`${await seededGamePath(page)}?utm_source=tiktok&utm_medium=paid&utm_campaign=outbound-test`);
        const link = page.getByRole('link', { name: 'Ir a la Tienda', exact: true });
        await expect(link).toHaveAttribute('href', /\/go\/product\/\d+\?attr_utm_source=tiktok/);
        const popup = context.waitForEvent('page');
        if (action === 'keyboard') { await link.focus(); await link.press('Enter'); }
        else await link.click({ button: action === 'middle' ? 'middle' : 'left' });
        const shop = await popup;
        await expect(shop.getByRole('heading', { name: 'Tienda de prueba' })).toBeVisible();
        expect(go).toHaveLength(1);
        expect(new URL(go[0]).searchParams.get('attr_utm_campaign')).toBe('outbound-test');
        expect(beacons.filter(body => body.includes('offer_click'))).toHaveLength(0);
    });
}

test('abrir el destino del enlace directamente también usa la redirección', async ({ page }) => {
    await page.goto(await seededGamePath(page));
    const href = await page.getByRole('link', { name: 'Ir a la Tienda', exact: true }).getAttribute('href');
    expect(href).toMatch(/^\/go\/product\//);
    const response = await page.request.get(href!, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toMatch(/^https?:\/\//);
});

test('cancelar el cupón no registra una salida; confirmarlo abre una sola redirección', async ({ page, context }) => {
    const go: string[] = [];
    context.on('request', req => { if (new URL(req.url()).pathname.startsWith('/go/')) go.push(req.url()); });
    await page.goto(await seededGamePath(page));
    const row = page.getByRole('row').filter({ hasText: 'E2E Importadora' });
    const offer = row.locator('a[href^="/go/product/"]:visible').first();
    await offer.click();
    const modal = page.getByRole('dialog', { name: '¡Esta tienda tiene cupón!' });
    await expect(modal).toBeVisible();
    expect(go).toHaveLength(0);
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).not.toBeVisible();
    expect(go).toHaveLength(0);
    await offer.click();
    const popup = context.waitForEvent('page');
    await modal.getByRole('link', { name: 'Tienda', exact: true }).click();
    await expect((await popup).getByRole('heading', { name: 'Tienda de prueba' })).toBeVisible();
    expect(go).toHaveLength(1);
});

test('el enlace general de una tienda usa la ruta de vendedores', async ({ page, context }) => {
    await page.goto(await seededGamePath(page));
    const href = await page.locator('a[href^="/store/"]').first().getAttribute('href');
    await page.goto(href!);
    const link = page.locator('a[href^="/go/store/"]');
    await expect(link).toBeVisible();
    const popup = context.waitForEvent('page');
    await link.click();
    await expect((await popup).getByRole('heading', { name: 'Tienda de prueba' })).toBeVisible();
});

test.describe('móvil', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    test('un toque abre la tienda mediante la redirección', async ({ page, context }) => {
        await page.goto(await seededGamePath(page));
        const popup = context.waitForEvent('page');
        await page.getByRole('link', { name: 'Ir a la Tienda', exact: true }).tap();
        await expect((await popup).getByRole('heading', { name: 'Tienda de prueba' })).toBeVisible();
    });
});
