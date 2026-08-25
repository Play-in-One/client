import { test, expect, type Page } from '@playwright/test';

/**
 * Recolecta los eventos que el navegador envía a POST /api/events/.
 *
 * Escucha `page.on('request')` en vez de `page.route`: los eventos salen por
 * `navigator.sendBeacon`, y el listener los ve sin interferir con el envío.
 * El cuerpo es multipart/form-data (ver el comentario en `src/lib/api.ts`), así
 * que basta con buscar los valores dentro del texto crudo.
 */
function collectEvents(page: Page): string[] {
    const bodies: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/events/')) {
            bodies.push(request.postData() ?? '');
        }
    });
    return bodies;
}

function hasEvent(bodies: string[], eventType: string, value: string): boolean {
    return bodies.some((body) => body.includes(eventType) && body.includes(value));
}

test('emite page_view en las páginas de información', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/about');
    await expect.poll(() => hasEvent(events, 'page_view', '/about')).toBe(true);

    await page.goto('/terms');
    await expect.poll(() => hasEvent(events, 'page_view', '/terms')).toBe(true);
});

test('no emite page_view duplicados para la misma ruta', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/about');
    await expect.poll(() => hasEvent(events, 'page_view', '/about')).toBe(true);
    await page.waitForTimeout(500);

    const aboutViews = events.filter((b) => b.includes('page_view') && b.includes('/about'));
    expect(aboutViews).toHaveLength(1);
});

test('no emite page_view en la ruta de administración', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/staff');
    await expect(page.getByRole('heading', { name: 'Acceso administrador' })).toBeVisible();
    await page.waitForTimeout(500);

    expect(hasEvent(events, 'page_view', '/staff')).toBe(false);
});

test('emite post_click al pulsar una tarjeta y post_view al abrir el post', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/blog');
    const card = page.locator('a[href^="/blog/"]').first();
    await expect(card).toBeVisible();

    const postId = (await card.getAttribute('href'))!.split('/').pop()!;
    await card.click();

    await expect.poll(() => hasEvent(events, 'post_click', postId)).toBe(true);
    await expect.poll(() => hasEvent(events, 'post_view', postId)).toBe(true);
    // La ruta del detalle también cuenta como visita: el pageview es global.
    await expect.poll(() => hasEvent(events, 'page_view', `/blog/${postId}`)).toBe(true);
});
