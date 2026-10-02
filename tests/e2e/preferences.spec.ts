import { test, expect, type Page } from '@playwright/test';
import { SEEDED, seededGamePath, COOKIE_DOMAIN } from './helpers';

// El menú de preferencias vive en el Navbar, que es un componente de cliente:
// a diferencia del resto de la suite, estos tests no dependen de interceptar
// las llamadas del render de servidor.

/** Quita el aviso de cookies, que ocupa el borde inferior y tapa lo que quede
 *  abajo del panel de preferencias (el filtro de ubicación va al final). */
const dismissCookies = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Solo esenciales' }).click({ timeout: 3000 }).catch(() => {});
};

const openMenu = async (page: import('@playwright/test').Page) => {
    await dismissCookies(page);
    await page.getByRole('button', { name: 'Preferencias' }).click();
};

// Un botón con `aria-pressed`, igual que el de las nacionales. `exact` porque el (i)
// de al lado también menciona «tiendas internacionales» en su nombre accesible.
const internationalButton = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Tiendas internacionales', exact: true });

const toggleInternational = async (page: import('@playwright/test').Page) => {
    await internationalButton(page).click();
};

/* El tema dejó de ser un Switch de "Modo oscuro" y es un SegmentedControl de
   dos posiciones rotulado "Tema", con un icono por opción. Mantine lo renderiza
   como un grupo de radios cuyo label es el SVG, así que no tienen nombre
   accesible: se eligen por posición dentro del grupo. */
const themeControl = (page: import('@playwright/test').Page) =>
    page.locator('[role="radiogroup"][aria-label="Tema"]');

const setTheme = async (page: import('@playwright/test').Page, value: 'light' | 'dark') => {
    // Mantine deja el <input> fuera del viewport y pone al lado un <label> que
    // lo referencia por `for` (no lo envuelve, así que `label:has(input)` no
    // sirve). Se pulsa el label, que es lo que ve y toca una persona.
    await themeControl(page)
        .locator(`.mantine-SegmentedControl-control:has(input[value="${value}"]) label`)
        .click();
};

const activeTheme = async (page: import('@playwright/test').Page) =>
    themeControl(page).locator('input:checked').inputValue();

test('el menú de preferencias agrupa el tema y las tiendas internacionales', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await expect(internationalButton(page)).toBeVisible();
    await expect(page.getByText('Tema')).toBeVisible();
});

test('el toggle de tema refleja el esquema activo y lo cambia', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);

    const scheme = () => page.evaluate(
        () => document.documentElement.getAttribute('data-mantine-color-scheme'),
    );
    // El control muestra el ESTADO, no la acción: la posición marcada es el
    // esquema vigente.
    expect(await activeTheme(page)).toBe(await scheme());

    await setTheme(page, 'dark');
    expect(await scheme()).toBe('dark');
    expect(await activeTheme(page)).toBe('dark');

    await setTheme(page, 'light');
    expect(await scheme()).toBe('light');
    expect(await activeTheme(page)).toBe('light');
});

test('las tiendas internacionales vienen activadas por defecto', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await expect(internationalButton(page)).toHaveAttribute('aria-pressed', 'true');
});

test('apagar las tiendas internacionales sobrevive a una recarga', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await toggleInternational(page);
    await expect(internationalButton(page)).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await openMenu(page);
    await expect(internationalButton(page)).toHaveAttribute('aria-pressed', 'false');
});

/** Las ubicaciones que la galería pidió a la API, como lista. */
const locationsOf = (url: string) =>
    (new URL(url).searchParams.get('seller_locations') ?? '').split(',').filter(Boolean);

const REGIONS = 16;

test('con las internacionales apagadas la galería pide solo nacionales y regiones', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await toggleInternational(page);

    const request = page.waitForRequest((r) => r.url().includes('/games/') && r.url().includes('seller_locations='));
    await page.goto('/search');
    const locations = locationsOf((await request).url());
    // `regions` = tiendas de cualquier región; no se listan las 16 una a una.
    expect(locations).toEqual(['national', 'regions']);
});


/* ── Sin parpadeo al cargar ───────────────────────────────────────────────
   El bug: con las internacionales apagadas, sus ofertas se veían un instante y
   luego desaparecían. Estos tests miran el HTML QUE MANDA EL SERVIDOR y el
   estado del documento antes de hidratar, no el resultado final — el final
   siempre fue correcto, el problema era el camino. */

const OFF = { name: 'pio_prefs', value: '{"condition":"all","international":false}', path: '/', domain: COOKIE_DOMAIN };

/** HTML crudo del documento, tal como llega del servidor. */
async function serverHtml(page: import('@playwright/test').Page, path: string) {
    const response = await page.goto(path);
    return (await response!.text());
}

test('el detalle llega del servidor ya filtrado, sin ofertas importadas', async ({ page, context }) => {
    const conCookie = await (async () => {
        await context.addCookies([OFF]);
        return serverHtml(page, '/game/1');
    })();
    // El globo sólo lo renderizan las tiendas internacionales (SellerScopeBadge).
    expect(conCookie).not.toContain('Tienda internacional');

    await context.clearCookies();
    const sinCookie = await serverHtml(page, '/game/1');
    // Control: sin la preferencia sí vienen, o el test de arriba no probaría nada.
    expect(sinCookie).toContain('Tienda internacional');
});

test('el documento trae el script que resuelve las preferencias antes de pintar', async ({ page }) => {
    const html = await serverHtml(page, '/');
    // Es lo que estampa `data-prefs` antes del primer paint. Sin él, el CSS de
    // abajo no tendría de qué colgarse y el flash volvería.
    expect(html).toContain('pio_prefs=');
    expect(html).toContain("setAttribute('data-prefs','pending')");
});

test('mientras el documento está marcado, el contenido dependiente no se ve', async ({ page }) => {
    await page.goto('/');
    const dependent = page.locator('[data-prefs-dependent]').first();
    await expect(dependent).toBeVisible();

    // Se prueba el mecanismo directamente en vez de intentar cazar el instante
    // real, que dura lo que tarda la hidratación y haría el test inestable.
    await page.evaluate(() => document.documentElement.setAttribute('data-prefs', 'pending'));
    await expect(dependent).toBeHidden();

    await page.evaluate(() => document.documentElement.removeAttribute('data-prefs'));
    await expect(dependent).toBeVisible();
});

test('la marca no sobrevive a la carga: la página nunca queda tapada', async ({ page, context }) => {
    await context.addCookies([OFF]);
    await page.goto('/');
    await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset.prefs), { timeout: 10_000 })
        .toBeUndefined();
    await expect(page.locator('[data-prefs-dependent]').first()).toBeVisible();
});

test('la galería no gasta una petición con el filtro equivocado', async ({ page, context }) => {
    await context.addCookies([OFF]);
    const calls: string[] = [];
    page.on('request', (r) => {
        if (r.url().includes('/api/games/?') || r.url().includes('/api/games/facets/')) calls.push(r.url());
    });
    await page.goto('/search');
    // `networkidle` solo puede salir antes de que el cliente pida (espera a
    // `ready`): se espera a la llamada en vez de suponer que ya salió.
    await expect.poll(() => calls.length).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle');

    // Lo que importa no es cuántas —el StrictMode de `next dev` duplica los
    // efectos— sino que NINGUNA salga con el filtro equivocado, que era el
    // fetch desperdiciado de antes.
    expect(calls.length).toBeGreaterThan(0);
    for (const url of calls) {
        const locations = locationsOf(url);
        expect(locations).toContain('national');
        expect(locations).not.toContain('international');
    }
});


/* ── Ubicación de la tienda: Nacional + región ────────────────────────────
   Tres controles independientes —los botones Internacional y Nacional y
   el mapa de regiones—. Una oferta se ve si su tienda pasa el control de SU
   categoría; con una región elegida solo quedan las tiendas de esa región. */

const nationalButton = (page: Page) => page.getByRole('button', { name: 'Tiendas nacionales' });
const regionToggle = (page: Page) => page.getByRole('button', { name: /^Región/ });

/** Abre el desplegable del mapa dentro del menú de preferencias. */
const openRegionPanel = async (page: Page) => {
    await openMenu(page);
    await regionToggle(page).click();
    await expect(page.getByRole('group', { name: 'Regiones de Chile' })).toBeVisible();
};

const regionPath = (page: Page, name: string) =>
    page.getByRole('group', { name: 'Regiones de Chile' }).getByRole('button', { name });

const prefsCookie = async (page: Page) => {
    const cookie = (await page.context().cookies()).find((c) => c.name === 'pio_prefs');
    return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null;
};

test('el botón Nacional viene activado y la región en «Todas»', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await expect(nationalButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(regionToggle(page)).toContainText('Todas');
});

test('la (i) de Nacional explica qué son y no cierra el menú', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await page.getByRole('button', { name: '¿Qué significa Nacional?' }).click();
    await expect(page.getByText(/operan en varias regiones del país/)).toBeVisible();
    // Un clic dentro del popover no es «fuera» del menú. Se mira el texto y no
    // el switch: Mantine oculta el <input> y Playwright lo da por invisible.
    await expect(internationalButton(page)).toBeVisible();
});

test('apagar Nacional deja la lista blanca sin «national» y sobrevive a una recarga', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await nationalButton(page).click();
    await expect(nationalButton(page)).toHaveAttribute('aria-pressed', 'false');
    expect((await prefsCookie(page)).national).toBe(false);

    const request = page.waitForRequest((r) => r.url().includes('/games/') && r.url().includes('seller_locations='));
    await page.goto('/search');
    const locations = locationsOf((await request).url());
    expect(locations).toContain('international');
    expect(locations).not.toContain('national');

    await page.reload();
    await openMenu(page);
    await expect(nationalButton(page)).toHaveAttribute('aria-pressed', 'false');
});

test('el mapa dibuja las 16 regiones, completas y dentro del menú', async ({ page }) => {
    await page.goto('/');
    await openRegionPanel(page);
    const map = page.getByRole('group', { name: 'Regiones de Chile' });
    await expect(map.getByRole('button')).toHaveCount(REGIONS);

    // Arica (norte) y Magallanes (sur) son los extremos que el `viewBox` del
    // mapa original cortaba: tienen que caber enteros dentro del SVG.
    const inside = async (name: string) => page.evaluate((label) => {
        const svg = document.querySelector('svg.chile-map')!;
        const path = svg.querySelector(`path[aria-label="${label}"]`) as SVGGraphicsElement;
        const s = svg.getBoundingClientRect();
        const p = path.getBoundingClientRect();
        return p.width > 0 && p.height > 0 && p.top >= s.top - 1 && p.bottom <= s.bottom + 1 &&
            p.left >= s.left - 1 && p.right <= s.right + 1;
    }, name);
    expect(await inside('Arica y Parinacota')).toBe(true);
    expect(await inside('Magallanes y la Antártica Chilena')).toBe(true);
});

test('elegir una región en el mapa filtra la galería y se puede quitar', async ({ page }) => {
    await page.goto('/');
    await openRegionPanel(page);
    await regionPath(page, 'Biobío').click();

    await expect(regionPath(page, 'Biobío')).toHaveAttribute('aria-pressed', 'true');
    await expect(regionToggle(page)).toContainText('Biobío');
    expect((await prefsCookie(page)).region).toBe('CL-BI');

    // Nacional e internacional siguen activos: la región solo acota las tiendas
    // físicas, así que la lista blanca es exactamente estas tres.
    const request = page.waitForRequest((r) => r.url().includes('/games/') && r.url().includes('seller_locations='));
    await page.goto('/search');
    expect(locationsOf((await request).url()).sort()).toEqual(['CL-BI', 'international', 'national']);

    await openRegionPanel(page);
    await page.getByRole('button', { name: 'Quitar región' }).click();
    await expect(regionToggle(page)).toContainText('Todas');
    expect((await prefsCookie(page)).region).toBeNull();
});

test('volver a clicar la región elegida la deselecciona', async ({ page }) => {
    await page.goto('/');
    await openRegionPanel(page);
    await regionPath(page, 'Biobío').click();
    await regionPath(page, 'Biobío').click();
    await expect(regionPath(page, 'Biobío')).toHaveAttribute('aria-pressed', 'false');
    await expect(regionToggle(page)).toContainText('Todas');
});

test('el selector de región edita el mismo valor que el mapa y se maneja con teclado', async ({ page }) => {
    await page.goto('/');
    await openRegionPanel(page);
    await page.getByRole('combobox', { name: 'Región de las tiendas' }).selectOption('CL-RM');
    await expect(regionPath(page, 'Metropolitana de Santiago')).toHaveAttribute('aria-pressed', 'true');

    // Enter sobre una región enfocada la elige, sin que el Menu se robe la tecla.
    await regionPath(page, 'Valparaíso').focus();
    await page.keyboard.press('Enter');
    await expect(regionToggle(page)).toContainText('Valparaíso');
    await expect(regionPath(page, 'Metropolitana de Santiago')).toHaveAttribute('aria-pressed', 'false');
});

test('en móvil el mismo filtro vive en el drawer y no desborda', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    // El aviso de cookies ocupa el borde inferior de una pantalla corta y tapa el mapa.
    await dismissCookies(page);
    await page.getByRole('navigation').getByRole('button').last().click();

    await expect(nationalButton(page)).toBeVisible();
    await regionToggle(page).click();
    // `dispatchEvent` y no `click()`: el centro del recuadro de Los Lagos (cóncavo, con
    // islas) cae fuera del relleno y el clic real pegaría en el <svg>. A este ancho el
    // mapa es chico a propósito; el selector nativo de al lado es la vía cómoda.
    await regionPath(page, 'Los Lagos').dispatchEvent('click');
    await expect(regionToggle(page)).toContainText('Los Lagos');
    expect((await prefsCookie(page)).region).toBe('CL-LL');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});

test('las descripciones de los filtros viven tras un (i) junto al título, sin cerrar el menú', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);

    const hints = [
        { label: '¿Qué hacen las tiendas internacionales?', text: /Al apagarlas, sus ofertas dejan de contar/ },
        { label: '¿Qué hace el estado físico?', text: /Acota el catálogo a juegos nuevos o usados/ },
        { label: '¿Qué hace el tipo digital?', text: /Acota el catálogo a compras en Store/ },
        { label: '¿Qué hace la región?', text: /solo ves las tiendas físicas de esa región/ },
    ];
    for (const { label, text } of hints) {
        // A la vista no hay texto explicativo suelto: solo el ícono.
        await expect(page.getByText(text)).toHaveCount(0);
        await page.getByRole('button', { name: label }).click();
        await expect(page.getByText(text)).toBeVisible();
        await expect(page.getByRole('menu')).toBeVisible();
        await page.getByRole('button', { name: label }).click();
        await expect(page.getByText(text)).toHaveCount(0);
    }
});

test('el menú de preferencias queda fijo al viewport y no se va con el scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/');
    await openMenu(page);
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    // El header es sticky y el dropdown va en un portal: con `position: absolute`
    // (el default de Mantine) se desplaza con la página y floating-ui lo corrige un
    // frame tarde, así que se ve temblar. Fijo al viewport no hay nada que corregir.
    await expect(menu).toHaveCSS('position', 'fixed');

    const before = await menu.boundingBox();
    await page.mouse.move(100, 400);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const after = await menu.boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
});

test('una cookie con región inventada no rompe nada y se ignora', async ({ page, context }) => {
    await context.addCookies([{
        name: 'pio_prefs', value: encodeURIComponent('{"region":"CL-ZZ","national":"si"}'),
        path: '/', domain: COOKIE_DOMAIN,
    }]);
    const seen: string[] = [];
    page.on('request', (r) => { if (r.url().includes('seller_locations=')) seen.push(r.url()); });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    expect(seen).toEqual([]);
    await openMenu(page);
    await expect(regionToggle(page)).toContainText('Todas');
});

/* ── La ficha filtra en memoria con las mismas reglas ─────────────────────── */

const withPrefs = (prefs: Record<string, unknown>) => ({
    name: 'pio_prefs', value: encodeURIComponent(JSON.stringify({ condition: 'all', ...prefs })),
    path: '/', domain: COOKIE_DOMAIN,
});

test('con Nacional apagado la ficha esconde la tienda nacional y conserva la importada', async ({ page, context }) => {
    const gamePath = await seededGamePath(page);
    await context.addCookies([withPrefs({ national: false })]);
    await page.goto(gamePath);
    const tabla = page.getByRole('table');
    await expect(tabla.getByText(SEEDED.internationalSeller).first()).toBeVisible();
    await expect(tabla.getByText(SEEDED.nationalSeller)).toHaveCount(0);
});

test('con una región elegida la ficha solo deja esa región, las nacionales y las importadas', async ({ page, context }) => {
    const gamePath = await seededGamePath(page);

    // Biobío: ve a su tienda regional, a la nacional y a la importada.
    await context.addCookies([withPrefs({ region: SEEDED.regionalSellerRegion })]);
    await page.goto(gamePath);
    const tabla = page.getByRole('table');
    await expect(tabla.getByText(SEEDED.regionalSeller).first()).toBeVisible();
    await expect(tabla.getByText(SEEDED.nationalSeller).first()).toBeVisible();
    await expect(tabla.getByText(SEEDED.internationalSeller).first()).toBeVisible();

    // Otra región: la tienda del Biobío desaparece; las otras dos siguen.
    await context.addCookies([withPrefs({ region: 'CL-RM' })]);
    await page.goto(gamePath);
    await expect(tabla.getByText(SEEDED.regionalSeller)).toHaveCount(0);
    await expect(tabla.getByText(SEEDED.nationalSeller).first()).toBeVisible();

    // Y con Nacional e Internacional apagadas queda solo la región.
    await context.addCookies([withPrefs({ region: SEEDED.regionalSellerRegion, national: false, international: false })]);
    await page.goto(gamePath);
    await expect(tabla.getByText(SEEDED.regionalSeller).first()).toBeVisible();
    await expect(tabla.getByText(SEEDED.nationalSeller)).toHaveCount(0);
    await expect(tabla.getByText(SEEDED.internationalSeller)).toHaveCount(0);
});

test('con una región o sin las nacionales el historial se marca como referencial', async ({ page, context }) => {
    const gamePath = await seededGamePath(page);
    await page.goto(gamePath);
    await expect(page.getByText('Historial referencial')).toHaveCount(0);

    await context.addCookies([withPrefs({ region: 'CL-RM' })]);
    await page.goto(gamePath);
    await expect(page.getByText(/Historial referencial/)).toBeVisible();
});
