import { test, expect } from '@playwright/test';

// El menú de preferencias vive en el Navbar, que es un componente de cliente:
// a diferencia del resto de la suite, estos tests no dependen de interceptar
// las llamadas del render de servidor.

const openMenu = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Preferencias' }).click();
};

// Mantine oculta visualmente el <input> del Switch, así que Playwright no puede
// clickearlo: se activa por su label, igual que haría una persona.
const toggleInternational = async (page: import('@playwright/test').Page) => {
    await page.getByText('Tiendas internacionales').click();
};

const internationalSwitch = (page: import('@playwright/test').Page) =>
    page.getByRole('switch', { name: 'Tiendas internacionales' });

const toggleDark = async (page: import('@playwright/test').Page) => {
    await page.getByText('Modo oscuro').click();
};

const darkSwitch = (page: import('@playwright/test').Page) =>
    page.getByRole('switch', { name: 'Modo oscuro' });

test('el menú de preferencias agrupa el tema y las tiendas internacionales', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await expect(page.getByText('Tiendas internacionales')).toBeVisible();
    await expect(page.getByText('Modo oscuro')).toBeVisible();
});

test('el toggle de tema refleja el esquema activo y lo cambia', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);

    const scheme = () => page.evaluate(
        () => document.documentElement.getAttribute('data-mantine-color-scheme'),
    );
    // El toggle muestra el ESTADO, no la acción: encendido == modo oscuro.
    expect(await darkSwitch(page).isChecked()).toBe((await scheme()) === 'dark');

    await toggleDark(page);
    expect(await scheme()).toBe('dark');
    await expect(darkSwitch(page)).toBeChecked();

    await toggleDark(page);
    expect(await scheme()).toBe('light');
    await expect(darkSwitch(page)).not.toBeChecked();
});

test('las tiendas internacionales vienen activadas por defecto', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await expect(internationalSwitch(page)).toBeChecked();
});

test('apagar las tiendas internacionales sobrevive a una recarga', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await toggleInternational(page);
    await expect(internationalSwitch(page)).not.toBeChecked();

    await page.reload();
    await openMenu(page);
    await expect(internationalSwitch(page)).not.toBeChecked();
});

test('con las internacionales apagadas la galería pide seller_scope=national', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await toggleInternational(page);

    const request = page.waitForRequest((r) => r.url().includes('/games/') && r.url().includes('seller_scope=national'));
    await page.goto('/search');
    await expect(await request).toBeTruthy();
});


/* ── Sin parpadeo al cargar ───────────────────────────────────────────────
   El bug: con las internacionales apagadas, sus ofertas se veían un instante y
   luego desaparecían. Estos tests miran el HTML QUE MANDA EL SERVIDOR y el
   estado del documento antes de hidratar, no el resultado final — el final
   siempre fue correcto, el problema era el camino. */

const OFF = { name: 'pio_prefs', value: '{"condition":"all","international":false}', path: '/', domain: 'localhost' };

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
    await page.waitForLoadState('networkidle');

    // Lo que importa no es cuántas —el StrictMode de `next dev` duplica los
    // efectos— sino que NINGUNA salga con el filtro equivocado, que era el
    // fetch desperdiciado de antes.
    expect(calls.length).toBeGreaterThan(0);
    for (const url of calls) expect(url).toContain('seller_scope=national');
});
