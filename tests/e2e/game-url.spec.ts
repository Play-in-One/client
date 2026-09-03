import { test, expect, type APIRequestContext } from '@playwright/test';

/* URLs de ficha: `/juego/<slug>-<id>`, con `/game/<id>` como redirección
 * permanente. Van contra el backend real (los mocks de `page.route` no
 * interceptan los fetch del servidor), así que el juego se toma del catálogo
 * que haya en la base de dev. */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

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
