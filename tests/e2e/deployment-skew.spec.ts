import { expect, test } from '@playwright/test';
import { CONSOLES_PUBLIC } from '../../src/lib/features';

test('una pestaña anterior recarga al navegar después de un despliegue', async ({ page }) => {
    test.skip(!process.env.E2E_DEPLOYMENT_ID, 'requiere un build de producción con NEXT_DEPLOYMENT_ID');

    const rscStatuses: number[] = [];
    const documentRequests: string[] = [];
    const pageErrors: string[] = [];

    page.on('request', (request) => {
        if (request.isNavigationRequest() && request.resourceType() === 'document') {
            documentRequests.push(request.url());
        }
    });
    page.on('response', (response) => {
        if (response.url().includes('/about') && response.request().headers().rsc === '1') {
            rscStatuses.push(response.status());
        }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    // La pestaña cargó el build actual, pero envía el ID de un build anterior.
    await page.route(/\/about(?:\?|$)/, (route) => {
        const headers = route.request().headers();
        if (headers.rsc === '1') {
            return route.continue({ headers: { ...headers, 'x-deployment-id': 'previous-release' } });
        }
        return route.continue();
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Sobre Nosotros' }).click();
    await expect(page).toHaveURL(/\/about$/);

    expect(rscStatuses).toContain(409);
    expect(documentRequests.some((url) => url.endsWith('/about'))).toBe(true);
    expect(pageErrors).toEqual([]);
});

test('una pestaña previa a la protección también recibe la orden de recargar', async ({ request }) => {
    test.skip(!process.env.E2E_DEPLOYMENT_ID, 'requiere un build de producción con NEXT_DEPLOYMENT_ID');

    const response = await request.get('/about', { headers: { rsc: '1' } });
    expect(response.status()).toBe(409);
    expect(response.headers()['cache-control']).toBe('no-store');
});

test('document searches remain available and hidden consoles redirect to games', async ({ page, request }) => {
    const games = await request.get('/search?q=Zelda');
    expect(games.status()).toBe(200);
    if (!CONSOLES_PUBLIC) {
        await page.goto('/search?category=console&search=PS5&storage_gb=1000');
        await expect(page).toHaveURL(/\/search\?q=PS5$/);
    }
});

test('un chunk que ya no existe recarga la página una sola vez', async ({ page }) => {
    const documents: string[] = [];
    let missing = '';
    let failed = 0;
    page.on('request', (request) => {
        if (request.isNavigationRequest() && request.resourceType() === 'document') documents.push(request.url());
    });
    // Como un estado de un despliegue anterior: el mismo chunk responde 404 siempre.
    await page.route(/\/_next\/static\/chunks\/.*\.js/, (route) => {
        const url = new URL(route.request().url()).pathname;
        missing ||= url;
        if (url !== missing) return route.continue();
        failed += 1;
        return route.fulfill({ status: 404, body: '' });
    });

    await page.goto('/about');
    await expect.poll(() => documents.length).toBe(2);
    // Sin bucle: el segundo fallo dentro del mismo minuto no vuelve a recargar.
    await page.waitForTimeout(1500);
    expect(documents).toHaveLength(2);
    expect(failed).toBe(2);
});
