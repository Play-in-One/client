import { test, expect, type APIRequestContext } from '@playwright/test';
import { SEEDED, robotsOf, serverHtml } from './helpers';
import { dealBadgeLine, dealConsoles, dealsSummarySentence } from '../../src/lib/deals';
import { gamePath } from '../../src/lib/seo';
import { formatCLP } from '../../src/lib/utils';
import type { DealsResponse, Platform } from '../../src/lib/types';

/**
 * `/ofertas` se resuelve ENTERA en el servidor (`DealsLanding`), así que estos
 * tests van contra el backend de dev: nada se puede mockear con `page.route`,
 * porque el fetch sale del contenedor de Next hacia `backend:8001`.
 *
 * La base de dev trae el catálogo real además de `seed_e2e`, con cientos de
 * ofertas: el juego sembrado a −33% puede quedar fuera del tope de 60. Por eso
 * lo que se exige es que la página publique EXACTAMENTE lo que responde la API
 * (frase, tarjetas y líneas de rebaja, calculadas con las mismas funciones), y
 * el juego sembrado se comprueba solo cuando la API lo incluye.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://pio.localhost:8080/api';
const DEAL = SEEDED.deal;

/** Lo que hace React con el texto al serializarlo: un nombre con `'` o `&`
 *  no aparece literal en el HTML. */
const escapeHtml = (text: string) =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

async function apiDeals(request: APIRequestContext, platform?: string): Promise<DealsResponse> {
    const res = await request.get(`${API}/deals/${platform ? `?platform=${platform}` : ''}`);
    if (!res.ok()) {
        throw new Error(`/api/deals/ respondió ${res.status()}: ¿backend sin la API de ofertas?`);
    }
    return res.json();
}

/** Bloques JSON-LD del HTML CRUDO (`serverHtml` quita los <script>). */
async function jsonLdBlocks(request: APIRequestContext, path: string): Promise<Record<string, unknown>[]> {
    const html = await (await request.get(path, { headers: { 'User-Agent': 'GPTBot' } })).text();
    return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
        const data = JSON.parse(m[1]);
        return Array.isArray(data) ? data : [data];
    });
}

/** Una consola del catálogo sin ninguna oferta hoy, preguntándole a la API
 *  por cada una: el listado global va capado y deduplicado por juego. */
async function consoleWithoutDeals(request: APIRequestContext): Promise<Platform | null> {
    const { results } = await (await request.get(`${API}/platforms/`)).json();
    for (const p of results as Platform[]) {
        if ((await apiDeals(request, p.slug)).count === 0) return p;
    }
    return null;
}

/** La página publica la frase y una tarjeta con su línea por cada oferta de
 *  la API, y los dos juegos sembrados que NO califican no salen. */
function expectListsDeals(html: string, res: DealsResponse, platform?: Platform) {
    expect(res.results.length).toBeGreaterThan(0);
    expect(html).toContain(escapeHtml(dealsSummarySentence(res, platform)));
    for (const deal of res.results) {
        expect(html).toContain(escapeHtml(deal.game.name));
        expect(html).toContain(escapeHtml(dealBadgeLine(deal)));
        // La tarjeta abre la ficha en la consola de la OFERTA y muestra SU
        // precio, no el mínimo del catálogo (Taxi Chaos: oferta en PS4 a
        // $7.900, mínimo del juego $4.585 en Windows).
        expect(html).toContain(`href="${gamePath(deal.game, deal.platform)}"`);
        expect(html).toContain(formatCLP(deal.current_price));
    }
    expect(html).not.toContain(DEAL.shallowGame);
    expect(html).not.toContain(DEAL.shortHistoryGame);
    const seeded = res.results.find((d) => d.game.id === DEAL.gameId);
    if (seeded) {
        expect(dealBadgeLine(seeded)).toBe(DEAL.line);
        expect(html).toContain(DEAL.line);
    }
}

test.describe('HTML del servidor', () => {
    test('los juegos sembrados que no califican no son ofertas en la API', async ({ request }) => {
        for (const platform of [undefined, DEAL.platform]) {
            const ids = (await apiDeals(request, platform)).results.map((d) => d.game.id);
            expect(ids).not.toContain(DEAL.shallowGameId);
            expect(ids).not.toContain(DEAL.shortHistoryGameId);
        }
    });

    test('/ofertas publica la frase, la regla y cada oferta con su rebaja', async ({ request }) => {
        const res = await request.get('/ofertas', { headers: { 'User-Agent': 'GPTBot' } });
        expect(res.status()).toBe(200);

        const html = await serverHtml(request, '/ofertas');
        expect(html).toMatch(/<h1[^>]*>Ofertas de videojuegos en Chile hoy<\/h1>/);
        expect(html).toContain('Calculadas sobre todas las tiendas y condiciones.');
        expect(html).toContain('Una oferta aparece aquí cuando el precio más bajo de hoy');
        expect(html).toMatch(/\d+ juegos? (están|está) al menos 15% bajo su precio típico de los últimos 90 días\./);
        expect(html).toMatch(/href="\/juego\/[a-z0-9-]+-\d+\?platform=[a-z0-9-]+"/);
        const api = await apiDeals(request);
        expectListsDeals(html, api);
        const [top] = api.results;
        expect(html).toContain(`−${Math.round(top.discount_pct)}%`);
        // Los chips de consola enlazan su página de ofertas.
        expect(html).toMatch(/href="\/ofertas\/[a-z0-9-]+"/);
        // El layout emite «index, follow» por defecto; lo que no puede haber es noindex.
        expect(robotsOf(html) ?? '').not.toMatch(/noindex/);
    });

    test('/ofertas publica CollectionPage, ItemList de las tarjetas y BreadcrumbList', async ({ request }) => {
        const blocks = await jsonLdBlocks(request, '/ofertas');
        expect(blocks.map((b) => b['@type'])).toEqual(
            expect.arrayContaining(['CollectionPage', 'ItemList', 'BreadcrumbList']),
        );
        const list = blocks.find((b) => b['@type'] === 'ItemList') as {
            itemListElement: { item: { name: string } }[];
        };
        const api = await apiDeals(request);
        expect(list.itemListElement.map((e) => e.item.name)).toEqual(api.results.map((d) => d.game.name));
    });

    test('/ofertas/<consola de la mayor rebaja> filtra por consola y se indexa', async ({ request }) => {
        const [top] = (await apiDeals(request)).results;
        const platforms = (await (await request.get(`${API}/platforms/`)).json()).results as Platform[];
        const platform = platforms.find((p) => p.slug === top.platform)!;
        const path = `/ofertas/${platform.slug}`;

        const res = await request.get(path, { headers: { 'User-Agent': 'GPTBot' } });
        expect(res.status()).toBe(200);
        const html = await serverHtml(request, path);
        const name = escapeHtml(platform.long_name || platform.display_name);
        expect(html).toMatch(new RegExp(`<h1[^>]*>Ofertas de ${name} hoy</h1>`));
        expect(html).toContain(`de ${name}`);

        const api = await apiDeals(request, platform.slug);
        expect(api.results.every((d) => d.platform === platform.slug)).toBe(true);
        expectListsDeals(html, api, platform);
        // La mayor rebaja global es también una oferta de su consola.
        expect(html).toContain(`href="${gamePath(top.game, top.platform)}"`);
        // Cada tarjeta abre la ficha en esa consola.
        const others = new RegExp(`href="/juego/[a-z0-9-]+-\\d+\\?platform=(?!${platform.slug}")[a-z0-9-]+"`);
        expect(html).not.toMatch(others);
        // El layout emite «index, follow» por defecto; lo que no puede haber es noindex.
        expect(robotsOf(html) ?? '').not.toMatch(/noindex/);
    });

    test('una consola sin ofertas responde 200 con el estado vacío y noindex', async ({ request }) => {
        const platform = await consoleWithoutDeals(request);
        test.skip(!platform, 'Todas las consolas tienen ofertas hoy: no hay con qué probar el estado vacío');
        if (!platform) return;
        const res = await request.get(`/ofertas/${platform.slug}`, { headers: { 'User-Agent': 'GPTBot' } });
        expect(res.status()).toBe(200);
        const html = await serverHtml(request, `/ofertas/${platform.slug}`);
        expect(html).toContain('Hoy no hay juegos de');
        expect(html).toContain('15% bajo su precio típico.');
        expect(html).toContain('href="/search"');
        expect(html).not.toContain('data-deal-card');
        expect(robotsOf(html)).toMatch(/noindex/);
    });

    test('una consola que no existe es un 404 de verdad', async ({ request }) => {
        const res = await request.get('/ofertas/consola-que-no-existe');
        expect(res.status()).toBe(404);
    });
});

test.describe('enlaces hacia /ofertas', () => {
    test('el Navbar de escritorio enlaza Ofertas', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/search');
        // `nav.navbar-bg` y no `getByRole('navigation')`: /ofertas tiene además
        // su propio <nav> de chips por consola.
        const link = page.locator('nav.navbar-bg').getByRole('link', { name: 'Ofertas', exact: true });
        await expect(link).toBeVisible();
        await link.click();
        // La navegación de cliente espera el payload de /ofertas (60 tarjetas, y en
        // dev además la compilación de la ruta): más que los 5 s por defecto.
        await expect(page).toHaveURL(/\/ofertas$/, { timeout: 30_000 });
        await expect(
            page.getByRole('heading', { level: 1, name: 'Ofertas de videojuegos en Chile hoy' }),
        ).toBeVisible();
    });

    test('el menú móvil enlaza Ofertas', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await page.goto('/search');
        // En móvil el único botón de la barra es el burger (ver navigation.spec).
        await page.locator('nav.navbar-bg').getByRole('button').last().click();
        const link = page.getByRole('dialog').getByRole('link', { name: 'Ofertas' });
        await expect(link).toBeVisible();
        await link.click();
        // La navegación de cliente espera el payload de /ofertas (60 tarjetas, y en
        // dev además la compilación de la ruta): más que los 5 s por defecto.
        await expect(page).toHaveURL(/\/ofertas$/, { timeout: 30_000 });
    });

    test('el Footer enlaza Ofertas en «Información»', async ({ request }) => {
        const html = await serverHtml(request, '/about');
        const footer = html.slice(html.lastIndexOf('<footer'));
        expect(footer).toContain('href="/ofertas"');
    });

    test('la home tiene «Ofertas de hoy» con las primeras ofertas y «Ver todas»', async ({ request }) => {
        const html = await serverHtml(request, '/');
        const start = html.indexOf('Ofertas de hoy');
        expect(start).toBeGreaterThan(-1);
        const end = html.indexOf('Populares esta semana', start);
        const section = html.slice(start, end > -1 ? end : undefined);
        const top = (await apiDeals(request)).results.slice(0, 8);
        for (const deal of top) {
            expect(section).toContain(escapeHtml(dealBadgeLine(deal)));
            expect(section).toContain(escapeHtml(deal.game.name));
        }
        expect(section.match(/data-deal-card/g)?.length).toBe(top.length);
        expect(section).toContain('href="/ofertas"');
    });

    test('el sitemap incluye /ofertas y las consolas con ofertas', async ({ request }) => {
        const xml = await (await request.get('/sitemap.xml')).text();
        expect(xml).toMatch(/<loc>[^<]*\/ofertas<\/loc>/);
        for (const p of dealConsoles((await apiDeals(request)).results)) {
            expect(xml).toMatch(new RegExp(`<loc>[^<]*/ofertas/${p.slug}</loc>`));
        }
    });

    test('llms.txt resume las ofertas del día', async ({ request }) => {
        const text = await (await request.get('/llms.txt')).text();
        expect(text).toContain('## Ofertas de hoy');
        expect(text).toContain('al menos 15% bajo su mediana de los últimos 90 días');
        const [first] = (await apiDeals(request)).results;
        expect(text).toContain(first.game.name.replace(/[[\]]/g, '\\$&'));
    });
});
