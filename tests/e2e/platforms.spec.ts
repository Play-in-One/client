import { test, expect } from '@playwright/test';
import { PLATFORMS, PLATFORMS_BY_SLUG, FAMILIES } from '../../src/lib/platforms';
import { serverHtml, robotsOf } from './helpers';

/**
 * El catálogo del cliente (`src/lib/platforms.ts`) y el del backend
 * (`Develop/backend/games/platforms.py`) tienen que cubrir las mismas consolas.
 *
 * Cuando divergen no falla nada visible: la consola que falta se sirve igual en
 * los filtros, el sitemap y su landing, pero sale con el icono genérico, en
 * gris y sin aparecer en el Navbar ni en el Footer. `xbox` y `pc` llevaban así
 * desde siempre.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://pio.localhost:8080/api';

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

test.describe('landings por consola: contenido veraz e indexación', () => {
    /** Una consola con más de una página de juegos (PAGE_SIZE = 24), si hay. */
    async function pagedPlatform(request: import('@playwright/test').APIRequestContext) {
        const res = await request.get(`${API_URL}/platforms/?page_size=100`);
        const { results } = await res.json();
        return results.find((p: { slug: string; game_count?: number }) => (p.game_count ?? 0) > 24) as
            | { slug: string }
            | undefined;
    }

    test('el resumen es un párrafo visible, no un <details>', async ({ request }) => {
        const platform = await pagedPlatform(request);
        test.skip(!platform, 'ninguna consola con más de 24 juegos en esta base');
        const html = await serverHtml(request, `/juegos/${platform!.slug}`);
        expect(html).toMatch(/<p\b[^>]*>\s*En Play in One comparamos/);
        expect(html).not.toMatch(/<details\b[^>]*>(?:(?!<\/details>)[\s\S])*En Play in One comparamos/);
        expect(html).not.toContain('más barato');
    });

    test('el HTML del servidor no afirma cuál es el más barato', async ({ request }) => {
        const platform = await pagedPlatform(request);
        test.skip(!platform, 'ninguna consola con más de 24 juegos en esta base');
        for (const path of [`/juegos/${platform!.slug}`, `/juegos/${platform!.slug}/pagina/2`, '/search']) {
            const html = await serverHtml(request, path);
            expect(html, path).not.toContain('del más barato al más caro');
            expect(html, path).not.toContain('más barato ahora es');
        }
    });

    test('las páginas interiores son noindex y la landing no', async ({ request }) => {
        const platform = await pagedPlatform(request);
        test.skip(!platform, 'ninguna consola con más de 24 juegos en esta base');
        const interior = robotsOf(await serverHtml(request, `/juegos/${platform!.slug}/pagina/2`));
        expect(interior).toContain('noindex');
        expect(interior).toContain('follow');
        const landing = robotsOf(await serverHtml(request, `/juegos/${platform!.slug}`));
        expect(landing ?? '').not.toContain('noindex');
    });

    test('el sitemap no lista páginas de paginación', async ({ request }) => {
        const res = await request.get('/sitemap.xml');
        expect(res.ok()).toBeTruthy();
        const xml = await res.text();
        expect(xml).toContain('/juegos/');
        expect(xml).not.toContain('/pagina/');
    });
});
