import { test, expect } from '@playwright/test';
import { PLATFORMS, PLATFORMS_BY_SLUG, FAMILIES } from '../../src/lib/platforms';

/**
 * El catálogo del cliente (`src/lib/platforms.ts`) y el del backend
 * (`Develop/backend/games/platforms.py`) tienen que cubrir las mismas consolas.
 *
 * Cuando divergen no falla nada visible: la consola que falta se sirve igual en
 * los filtros, el sitemap y su landing, pero sale con el icono genérico, en
 * gris y sin aparecer en el Navbar ni en el Footer. `xbox` y `pc` llevaban así
 * desde siempre.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

test.describe('catálogo de consolas', () => {
    test('el catálogo cubre todas las plataformas que publica la API', async ({ request }) => {
        const res = await request.get(`${API_URL}/platforms/?page_size=100`);
        expect(res.ok()).toBeTruthy();
        const { results } = await res.json();
        expect(results.length).toBeGreaterThan(0);

        const missing = results
            .map((p: { slug: string }) => p.slug)
            .filter((slug: string) => !PLATFORMS_BY_SLUG[slug]);

        expect(
            missing,
            'consolas que la API sirve y el cliente pintaría en gris y sin nombre',
        ).toEqual([]);
    });

    test('ninguna consola del catálogo sobra respecto de la API', async ({ request }) => {
        const res = await request.get(`${API_URL}/platforms/?page_size=100`);
        const { results } = await res.json();
        const served = new Set(results.map((p: { slug: string }) => p.slug));

        const extra = PLATFORMS.map((p) => p.slug).filter((slug) => !served.has(slug));
        expect(extra, 'consolas que el cliente enlaza y el backend no conoce').toEqual([]);
    });

    test('el backend mantiene name y slug idénticos', async ({ request }) => {
        // Es el contrato del que depende la serie de `min_price_history`, que
        // se indexa por `name` mientras el resto del cliente habla de slugs.
        const res = await request.get(`${API_URL}/platforms/?page_size=100`);
        const { results } = await res.json();
        for (const platform of results) {
            expect(platform.name, platform.slug).toBe(platform.slug);
        }
    });

    test('cada familia tiene consolas y al menos una destacada', async () => {
        for (const { family, label } of FAMILIES) {
            const members = PLATFORMS.filter((p) => p.family === family);
            expect(members.length, `${label} sin consolas`).toBeGreaterThan(0);
            expect(
                members.some((p) => p.featured),
                `${label} no destaca ninguna consola: su tarjeta de la home filtraría por nada`,
            ).toBeTruthy();
        }
    });

    test('el Footer enlaza la landing de todas las consolas', async ({ page }) => {
        await page.goto('/');
        const hrefs = await page
            .locator('footer a[href^="/juegos/"]')
            .evaluateAll((links) => links.map((a) => a.getAttribute('href')));

        for (const platform of PLATFORMS) {
            expect(hrefs, platform.slug).toContain(`/juegos/${platform.slug}`);
        }
    });

    test('/juegos/pc redirige a la landing de Windows', async ({ request }) => {
        // `pc` se retiró del catálogo y su landing estaba indexada.
        const res = await request.get('/juegos/pc', { maxRedirects: 0 });
        expect(res.status()).toBe(308);
        expect(res.headers()['location']).toBe('/juegos/win');
    });
});
