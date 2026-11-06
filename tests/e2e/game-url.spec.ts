import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { SEEDED } from './helpers';

/* URLs de ficha: `/juego/<slug>-<id>`, con `/game/<id>` como redirección
 * permanente. Van contra el backend real (los mocks de `page.route` no
 * interceptan los fetch del servidor), así que el juego se toma del catálogo
 * que haya en la base de dev. */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://pio.localhost:8080/api';

async function anyGame(request: APIRequestContext) {
    const res = await request.get(`${API}/games/?page=1`);
    expect(res.ok()).toBeTruthy();
    const game = (await res.json()).results[0];
    expect(game, 'la base de dev necesita al menos un juego con oferta').toBeTruthy();
    return game as { id: number; slug: string; name: string };
}

test('/game/<id> redirige permanentemente a /juego/<slug>-<id>', async ({ request }) => {
    const game = await anyGame(request);
    const res = await request.get(`/game/${game.id}`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()['location']).toMatch(new RegExp(`/juego/${game.slug}-${game.id}$`));
});

test('la redirección conserva ?platform=', async ({ request }) => {
    const game = await anyGame(request);
    const res = await request.get(`/game/${game.id}?platform=ps5`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()['location']).toMatch(new RegExp(`/juego/${game.slug}-${game.id}\\?platform=ps5$`));
});

test('un slug equivocado se corrige con 308 a la canónica', async ({ request }) => {
    const game = await anyGame(request);
    const res = await request.get(`/juego/basura-${game.id}`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()['location']).toMatch(new RegExp(`/juego/${game.slug}-${game.id}$`));
});

test('la ficha canónica responde 200 con canonical y título de precio', async ({ request }) => {
    const game = await anyGame(request);
    const res = await request.get(`/juego/${game.slug}-${game.id}`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<link rel="canonical" href="http://localhost:3001/juego/${game.slug}-${game.id}"/>`);
    expect(html).toMatch(new RegExp(`<title>${game.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: precios? en Chile`));
    expect(html).not.toContain('aggregateRating');
    // El JSON-LD publica la URL nueva, no la vieja.
    expect(html).toContain(`/juego/${game.slug}-${game.id}#product`);
    expect(html).not.toContain(`/game/${game.id}`);
});

test('un juego inexistente es un 404 de verdad, no un 200 con noindex', async ({ request }) => {
    const res = await request.get('/juego/nada-99999999', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
});

test('un segmento sin id es 404', async ({ request }) => {
    const res = await request.get('/juego/sin-numero', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
});

/* Las peticiones RSC —el prefetch de una tarjeta y la navegación del cliente—
 * no esperan al backend en el layout: ahí el status HTTP no lo ve nadie y el
 * router resuelve el 404 y el 308 dentro del stream. Solo un documento
 * necesita el status real. Si el layout volviera a consultar en RSC, el
 * prefetch del esqueleto esperaría el detalle del juego y el clic en la
 * tarjeta parecería muerto hasta que llegara. */
function rscHeaders(extra: Record<string, string> = {}) {
    const deployment = process.env.E2E_DEPLOYMENT_ID;
    return { rsc: '1', ...(deployment ? { 'x-deployment-id': deployment } : {}), ...extra };
}

test('el prefetch de una ficha no espera al backend en el layout', async ({ request }) => {
    const game = await anyGame(request);
    // Un slug equivocado delata la consulta: con ella, el layout redirige.
    const res = await request.get(`/juego/basura-${game.id}`, {
        headers: rscHeaders({ 'next-router-prefetch': '1' }),
        maxRedirects: 0,
    });
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain('NEXT_REDIRECT');
});

/** Navegación del cliente, como la de un `<Link>`. Antes de hidratar el
 *  router ya existe pero descarta el push, así que primero se espera la carga. */
async function clientNavigate(page: Page, href: string) {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await page.evaluate((h) => (window as unknown as { next: { router: { push(h: string): void } } }).next.router.push(h), href);
}

test('la navegación del cliente a un slug equivocado termina en la canónica', async ({ page, request }) => {
    const game = await anyGame(request);
    await clientNavigate(page, `/juego/basura-${game.id}`);
    await expect(page).toHaveURL(new RegExp(`/juego/${game.slug}-${game.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: game.name })).toBeVisible();
});

test('la navegación del cliente a un juego inexistente muestra la 404', async ({ page }) => {
    await clientNavigate(page, '/juego/nada-99999999');
    await expect(page).toHaveURL(/\/juego\/nada-99999999$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
});

test('la tarjeta avisa al instante que está abriendo la ficha', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(SEEDED.game)}`);
    // Una red lenta: la respuesta RSC de la ficha tarda 3 s en llegar. El velo
    // tiene que verse mucho antes, mientras la URL todavía no cambió.
    await page.route(/\/juego\/[^?]*\?.*_rsc=/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
    });
    const card = page.locator(`a[href*="-${SEEDED.gameId}"]`).first();
    await card.click();
    await expect(card.locator('[data-link-pending]')).toBeVisible({ timeout: 1500 });
    // Y la navegación sigue su curso cuando llega la respuesta retrasada.
    await expect(page).toHaveURL(new RegExp(`-${SEEDED.gameId}\\?platform=`), { timeout: 15_000 });
});

test('la tarjeta abre la ficha en la consola del precio que muestra', async ({ page }) => {
    // Sin filtro de consola: antes la tarjeta enlazaba la ficha a secas.
    await page.goto(`/search?q=${encodeURIComponent(SEEDED.game)}`);
    const card = page.locator(`a[href*="-${SEEDED.gameId}"]`).first();
    await expect(card).toHaveAttribute('href', new RegExp(`-${SEEDED.gameId}\\?platform=ps5$`));
});
