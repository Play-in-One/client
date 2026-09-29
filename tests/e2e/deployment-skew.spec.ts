import { expect, test } from '@playwright/test';

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
