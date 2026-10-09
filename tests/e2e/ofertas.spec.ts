import { test, expect, type APIRequestContext, type Page, type Request } from '@playwright/test';
import { SEEDED, robotsOf, serverHtml } from './helpers';
import {
    dealBadgeLine,
    dealConsoleLinkLabel,
    dealConsoleChips,
    dealConsoleSlugs,
    dealFromGame,
    dealsHeading,
    dealsSectionTitle,
    dealsSummarySentence,
} from '../../src/lib/deals';
import { gamePath } from '../../src/lib/seo';
import { formatCLP } from '../../src/lib/utils';
import type { DealsResponse, Game, PaginatedResponse, Platform } from '../../src/lib/types';

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

/** El HTML de cada tarjeta de oferta, en orden: del marcador `data-deal-card`
 *  hasta el siguiente. La última se corta al cerrar su línea de rebaja
 *  (`data-deal-line`, el texto accesible de la etiqueta «↓N% (i)» junto al
 *  precio) para no arrastrar el resto de la página. */
function dealCardsHtml(html: string): string[] {
    return html.split('data-deal-card').slice(1).map((chunk) => {
        const line = chunk.indexOf('data-deal-line');
        const end = line > -1 ? chunk.indexOf('</span>', line) : -1;
        return end > -1 ? chunk.slice(0, end) : chunk;
    });
}

/** La página publica la frase y una tarjeta con su línea por cada oferta de
 *  la API, y los dos juegos sembrados que NO califican no salen. */
function expectListsDeals(html: string, res: DealsResponse, platform?: Platform) {
    expect(res.results.length).toBeGreaterThan(0);
    expect(html).toContain(escapeHtml(dealsSummarySentence(res, platform)));
    const cards = dealCardsHtml(html);
    expect(cards).toHaveLength(res.results.length);
    res.results.forEach((deal, i) => {
        // Cada aserción sobre SU tarjeta y no sobre la página entera: el precio
        // de una oferta suele aparecer en otra parte (la frase, otra tarjeta),
        // y así se colaba una tarjeta que pintaba el mínimo del catálogo.
        const card = cards[i];
        expect(card).toContain(escapeHtml(deal.game.name));
        expect(card).toContain(escapeHtml(dealBadgeLine(deal)));
        // La tarjeta abre la ficha en la consola de la OFERTA y muestra SU
        // precio, no el mínimo del catálogo (Taxi Chaos: oferta en PS4 a
        // $7.900, mínimo del juego $4.585 en Windows).
        expect(card).toContain(`href="${gamePath(deal.game, deal.platform)}"`);
        expect(card).toContain(formatCLP(deal.current_price));
        if (deal.game.min_price && Number(deal.game.min_price) !== Number(deal.current_price)) {
            // El mínimo del catálogo es otra oferta: no puede ser la cifra de la tarjeta.
            expect(card).not.toContain(`>${formatCLP(deal.game.min_price)}<`);
        }
    });
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
        const api = await apiDeals(request);
        // «hoy» o «del <fecha>» según la fecha de la tanda (`dealsHeading`):
        // la base de dev puede no haber recalculado hoy.
        expect(html).toContain(`>${dealsHeading(undefined, api)}</h1>`);
        expect(html).toContain('El precio típico de cada oferta considera todas las tiendas de esa condición.');
        // La aclaración de los totales va dentro de la (i), junto a ellos.
        const disclosure = html.slice(html.indexOf('pio-info-heading'), html.indexOf('</details>', html.indexOf('pio-info-heading')));
        expect(disclosure).toContain('Estos totales son del catálogo completo; la grilla de abajo sigue tus filtros y preferencias.');
        expect(html).toContain('Una oferta aparece aquí cuando el precio más bajo de hoy');
        expect(html).toMatch(/\d+ juegos? (están|está|estaban|estaba) al menos 15% bajo su precio típico de los últimos 90 días\./);
        expect(html).toMatch(/href="\/juego\/[a-z0-9-]+-\d+\?platform=[a-z0-9-]+"/);
        expectListsDeals(html, api);
        // «Registrado», no «histórico»: la serie empieza cuando PIO empezó a medir.
        expect(html).not.toContain('Mínimo histórico');
        if (api.results.some((d) => d.is_all_time_low)) expect(html).toContain('Mínimo registrado');
        const [top] = api.results;
        expect(html).toContain(`−${Math.round(top.discount_pct)}%`);
        // La lista «Ofertas por consola» (tras la (i)) enlaza cada página de ofertas.
        expect(html).toMatch(/href="\/ofertas\/[a-z0-9-]+"/);
        // El layout emite «index, follow» por defecto; lo que no puede haber es noindex.
        expect(robotsOf(html) ?? '').not.toMatch(/noindex/);
    });

    test('los enlaces por consola van tras la (i), son TODAS las consolas con ofertas y llevan su conteo', async ({ request }) => {
        const api = await apiDeals(request);
        // `platforms` es la lista completa del día: puede traer consolas que no
        // llegan a las 60 tarjetas, y esas también necesitan su enlace. Son el
        // único enlace interno a `/ofertas/<consola>`: quitarlos dejaría esas
        // páginas solo en el sitemap.
        expect(api.platforms?.length).toBeGreaterThan(0);
        const catalog = (await (await request.get(`${API}/platforms/`)).json()).results as Platform[];
        const chips = dealConsoleChips(api, catalog);
        expect(chips.map((c) => c.platform.slug)).toEqual(api.platforms!.map((p) => p.slug));

        for (const path of ['/ofertas', `/ofertas/${DEAL.platform}`]) {
            const html = await serverHtml(request, path);
            // Dentro del <details> de la (i) del título, no en un selector suelto.
            const disclosure = html.slice(
                html.indexOf('pio-info-heading'),
                html.indexOf('</details>', html.indexOf('pio-info-heading')),
            );
            expect(disclosure).toContain('aria-label="Ofertas por consola"');
            // Mismo orden que la API, con o sin consola en la URL.
            expect([...disclosure.matchAll(/data-deal-chip="([^"]+)"/g)].map((m) => m[1])).toEqual(
                chips.map((c) => c.platform.slug),
            );
            for (const chip of chips) {
                // «PlayStation 5 (389)»
                expect(html).toContain(escapeHtml(dealConsoleLinkLabel(chip)));
                expect(html).toContain(`href="/ofertas/${chip.platform.slug}"`);
            }
        }
    });

    test('/ofertas publica CollectionPage, ItemList de las tarjetas y BreadcrumbList', async ({ request }) => {
        const blocks = await jsonLdBlocks(request, '/ofertas');
        expect(blocks.map((b) => b['@type'])).toEqual(
            expect.arrayContaining(['CollectionPage', 'ItemList', 'BreadcrumbList']),
        );
        const list = blocks.find((b) => b['@type'] === 'ItemList') as {
            itemListElement: Record<string, unknown>[];
        };
        const api = await apiDeals(request);
        expect(list.itemListElement.map((e) => e.name)).toEqual(api.results.map((d) => d.game.name));
        // Coherente para todas las tarjetas: posición, nombre y URL, sin precios
        // (la tarjeta no siempre conoce el desglose de la oferta).
        list.itemListElement.forEach((e, i) => {
            expect(Object.keys(e).sort()).toEqual(['@type', 'name', 'position', 'url']);
            expect(e.position).toBe(i + 1);
        });
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
        const api = await apiDeals(request, platform.slug);
        expect(html).toContain(`>${escapeHtml(dealsHeading(platform, api))}</h1>`);
        expect(html).toContain(`de ${name}`);

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

/* ── El explorador: mismos filtros que las galerías de consola ──────────────
 * Esto sí corre en el navegador: el sidebar y las peticiones con `deals=1` los
 * monta `GameExplorer` al hidratar. Se miran las peticiones reales (no mocks)
 * porque lo que se prueba es justamente que salgan con `deals=1`.
 */

/** Títulos de las secciones del sidebar de escritorio, en orden. */
async function sidebarSections(page: Page): Promise<string[]> {
    const sections = page.locator('[data-explorer-sidebar] [data-filter-section]');
    await expect(sections.first()).toBeVisible();
    return sections.evaluateAll((els) => els.map((el) => el.getAttribute('data-filter-section') ?? ''));
}

/** ¿Es una petición del listado de juegos (no de facets) con `deals=1`? */
const isDealsListing = (req: Request, extra: (params: URLSearchParams) => boolean = () => true) => {
    const url = new URL(req.url());
    return /\/api\/games\/$/.test(url.pathname) && url.searchParams.get('deals') === '1' && extra(url.searchParams);
};

/** Cambia el orden a «Menor precio» (saca al explorador del modo estático) y
 *  devuelve la respuesta de la petición que eso dispara. */
async function orderByLowestPrice(page: Page): Promise<{ req: Request; body: PaginatedResponse<Game> }> {
    const requestPromise = page.waitForRequest((r) =>
        isDealsListing(r, (p) => p.get('ordering') === 'min_price'));
    await page.getByRole('textbox', { name: 'Ordenar por' }).click();
    await page.getByRole('option', { name: 'Menor precio' }).click();
    const req = await requestPromise;
    const res = await req.response();
    expect(res?.ok()).toBe(true);
    return { req, body: await res!.json() };
}

test.describe('/ofertas en el navegador: GameExplorer acotado a ofertas', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
    });

    test('el sidebar ofrece los mismos filtros que la galería de una consola, sin «En oferta»', async ({ page }) => {
        // Los títulos se leen de la landing en vez de escribirlos aquí: si las
        // galerías ganan o pierden un filtro, /ofertas tiene que seguirlas.
        await page.goto(`/juegos/${DEAL.platform}`);
        const landing = await sidebarSections(page);
        expect(landing).toContain('Ofertas');

        await page.goto('/ofertas');
        const deals = await sidebarSections(page);
        // «En oferta» (`on_sale`) es otro concepto: aquí no se ofrece.
        expect(deals).not.toContain('Ofertas');
        const shared = landing.filter((t) => t !== 'Ofertas');
        expect(shared.length).toBeGreaterThanOrEqual(2);
        for (const title of shared) expect(deals).toContain(title);
        // Los controles de esas secciones, no solo sus títulos.
        await expect(page.locator('[data-explorer-sidebar]').getByPlaceholder('Mín')).toBeVisible();
        await expect(page.locator('[data-explorer-sidebar]').getByRole('slider')).toBeVisible();
    });

    test('el orden por defecto es «Mayor descuento» y los facets se piden con deals=1', async ({ page }) => {
        const facets = page.waitForRequest((r) => {
            const url = new URL(r.url());
            return url.pathname.endsWith('/api/games/facets/') && url.searchParams.get('deals') === '1';
        });
        await page.goto('/ofertas');
        await facets;
        await expect(page.getByRole('textbox', { name: 'Ordenar por' })).toHaveValue('Mayor descuento');
        await page.getByRole('textbox', { name: 'Ordenar por' }).click();
        // Los demás órdenes siguen ahí.
        await expect(page.getByRole('option', { name: 'Mayor descuento' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Menor precio' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Más populares' })).toBeVisible();
    });

    test('al cambiar el orden pide /api/games/ con deals=1 y las tarjetas siguen siendo de oferta', async ({ page }) => {
        await page.goto('/ofertas');
        const { body } = await orderByLowestPrice(page);
        expect(body.results.length).toBeGreaterThan(0);
        const first = dealFromGame(body.results[0]);
        expect(first, '¿backend sin `deal` en /api/games/?deals=1?').not.toBeNull();

        // La grilla interactiva reemplazó a la del servidor: la primera tarjeta
        // es la primera de la respuesta, con la línea de rebaja de SU oferta.
        const card = page.locator('[data-deal-card]').first();
        await expect(card).toContainText(first!.game.name);
        await expect(card.locator('[data-deal-line]')).toHaveText(dealBadgeLine(first!));
        await expect(page.locator('[data-deal-card]')).toHaveCount(body.results.length);
        await expect(page.locator('[data-deal-line]')).toHaveCount(body.results.length);
    });

    test('la etiqueta «↓N%» junto al precio abre el detalle sin navegar a la ficha', async ({ page, request }) => {
        const api = await apiDeals(request);
        const [top] = api.results;
        await page.goto('/ofertas');
        const label = page.locator('[data-deal-card]').first().locator('[data-deal-label]');
        await expect(label).toContainText(`${Math.round(top.discount_pct)}%`);
        // Un click antes de hidratar puede perderse: se reintenta hasta que abra.
        // El aviso de cookies también es un `dialog`: se acota al del detalle.
        const dialog = page.getByRole('dialog').filter({ hasText: 'Precio típico' });
        await expect(async () => {
            if ((await label.getAttribute('aria-expanded')) !== 'true') await label.click();
            await expect(dialog).toBeVisible({ timeout: 1000 });
        }).toPass();
        await expect(dialog).toContainText(formatCLP(top.typical_price));
        await expect(dialog).toContainText(formatCLP(top.savings));
        // La tarjeta es un enlace a la ficha: abrir la (i) no puede navegar.
        await expect(page).toHaveURL(/\/ofertas$/);
    });

    test('elegir un género pide /api/games/ con deals=1 y ese género', async ({ page }) => {
        await page.goto('/ofertas');
        const genres = page.locator('[data-explorer-sidebar] [data-filter-section="Género"]').getByRole('checkbox');
        // «Todos» + los géneros, que llegan de /api/genres/ al hidratar.
        await expect.poll(() => genres.count()).toBeGreaterThan(1);
        const request = page.waitForRequest((r) => isDealsListing(r, (p) => !!p.get('genres')));
        await genres.nth(1).check();
        const req = await request;
        expect((await req.response())?.ok()).toBe(true);
    });

    test('/ofertas/<consola> acota el explorador a esa consola además de a las ofertas', async ({ page, request }) => {
        const platforms = (await (await request.get(`${API}/platforms/`)).json()).results as Platform[];
        const platform = platforms.find((p) => p.slug === DEAL.platform)!;
        await page.goto(`/ofertas/${platform.slug}`);
        // Sin selector de consola: la fija la URL, como en /juegos/<consola>.
        expect(await sidebarSections(page)).not.toContain('Plataforma');
        const { req, body } = await orderByLowestPrice(page);
        expect(new URL(req.url()).searchParams.get('platforms')).toBe(String(platform.id));
        for (const game of body.results) expect(game.deal?.platform).toBe(platform.slug);
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
            page.getByRole('heading', { level: 1, name: /^Ofertas de videojuegos en Chile (hoy|del )/ }),
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
        const api = await apiDeals(request);
        // «Ofertas de hoy», u «Ofertas del <fecha>» si la tanda no es de hoy.
        const start = html.indexOf(`>${dealsSectionTitle(api)}<`);
        expect(start).toBeGreaterThan(-1);
        const end = html.indexOf('Populares esta semana', start);
        const section = html.slice(start, end > -1 ? end : undefined);
        const top = api.results.slice(0, 8);
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
        // Todas las consolas del día (`platforms`), no solo las de las tarjetas.
        const slugs = dealConsoleSlugs(await apiDeals(request));
        expect(slugs.length).toBeGreaterThan(0);
        for (const slug of slugs) {
            expect(xml).toMatch(new RegExp(`<loc>[^<]*/ofertas/${slug}</loc>`));
        }
    });

    test('llms.txt resume las ofertas del día', async ({ request }) => {
        const text = await (await request.get('/llms.txt')).text();
        const api = await apiDeals(request);
        // llms.txt cachea su fetch de ofertas 1 h y el cálculo no lo revalida:
        // justo después de un `build_daily_deals` puede citar la tanda
        // anterior. Lo que no puede es llamarla «de hoy»: o el título coincide
        // con el de la API, o lleva la fecha de su propia tanda.
        const heading = text.match(/^## (Ofertas (?:de hoy|del \d{1,2} de [a-z]+ de \d{4}))$/m)?.[1];
        expect(heading).toBeTruthy();
        expect(text).toContain('al menos 15% bajo su mediana de los últimos 90 días');
        if (heading === dealsSectionTitle(api)) {
            const [first] = api.results;
            expect(text).toContain(first.game.name.replace(/[[\]]/g, '\\$&'));
        }
    });
});
