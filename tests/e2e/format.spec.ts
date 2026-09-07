import { test, expect } from '@playwright/test';

/* El filtro de FORMATO (físico ↔ digital) vive en la barra del navbar; el de
 * ESTADO (nuevo/usado) se movió al menú de preferencias, porque solo acota lo
 * físico: una descarga no es de segunda mano.
 *
 * Los dos son un único campo en el backend (`Product.condition`), así que lo
 * que se prueba aquí es sobre todo la TRADUCCIÓN del par a `?condition=`.
 */

const openMenu = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Preferencias' }).click();
};

// Mantine renderiza el SegmentedControl como un `role="radiogroup"` de radios
// nativos ocultos: se eligen por su label, igual que haría una persona.
const formatControl = (page: import('@playwright/test').Page) =>
    page.getByRole('radiogroup', { name: 'Formato' }).first();

const pickFormat = async (page: import('@playwright/test').Page, label: string) => {
    // El <input type="radio"> está oculto visualmente, así que se clickea su
    // label —igual que los Switch del menú en `preferences.spec.ts`—.
    await formatControl(page).getByText(label, { exact: true }).click();
};

/** Todas las llamadas de galería que salieron, para poder exigir que NINGUNA
 *  lleve el filtro equivocado (no solo que alguna lleve el bueno). */
const collectGalleryCalls = (page: import('@playwright/test').Page) => {
    const calls: string[] = [];
    page.on('request', (r) => {
        const url = r.url();
        if (url.includes('/api/games/?') || url.includes('/api/games/facets/')) calls.push(url);
    });
    return calls;
};

test('el formato vive en la barra y el estado en preferencias', async ({ page }) => {
    await page.goto('/');

    await expect(formatControl(page)).toBeVisible();
    await expect(formatControl(page).getByRole('radio', { name: 'Digital' })).toHaveCount(1);
    // El estado ya no está suelto en la barra: hay que abrir el menú.
    await expect(page.getByRole('radio', { name: 'Usados' })).toHaveCount(0);

    await openMenu(page);
    const estado = page.getByRole('radiogroup', { name: 'Estado del juego' });
    await expect(estado.getByRole('radio', { name: 'Usados' })).toHaveCount(1);
    await expect(estado.getByRole('radio', { name: 'Nuevos' })).toHaveCount(1);
});

test('el formato elegido sobrevive a una recarga', async ({ page }) => {
    await page.goto('/');
    await pickFormat(page, 'Digital');

    await page.reload();
    await expect(
        formatControl(page).getByRole('radio', { name: 'Digital' }),
    ).toBeChecked();
});

test('físico con estado "todos" pide condition=physical', async ({ page }) => {
    await page.goto('/');
    await pickFormat(page, 'Físico');

    const request = page.waitForRequest(
        (r) => r.url().includes('/api/games/?') && r.url().includes('condition=physical'),
    );
    await page.goto('/search');
    expect(await request).toBeTruthy();
});

test('digital pide condition=digital y deshabilita el estado', async ({ page }) => {
    await page.goto('/');
    await pickFormat(page, 'Digital');

    await openMenu(page);
    // Un control apagado sin explicación se lee como un bug, así que el texto
    // es parte del contrato.
    await expect(page.getByText('Las descargas no son de segunda mano.')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Usados' })).toBeDisabled();
    await page.keyboard.press('Escape');

    const request = page.waitForRequest(
        (r) => r.url().includes('/api/games/?') && r.url().includes('condition=digital'),
    );
    await page.goto('/search');
    expect(await request).toBeTruthy();
});

test('el estado guardado se conserva al pasar por digital y volver', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await page.getByRole('radiogroup', { name: 'Estado del juego' })
        .getByText('Usados', { exact: true }).click();
    await page.keyboard.press('Escape');

    await pickFormat(page, 'Digital');
    await pickFormat(page, 'Físico');

    await openMenu(page);
    // Se apaga el control, no el dato: quien tenía "Usados" lo recupera.
    await expect(page.getByRole('radio', { name: 'Usados' })).toBeChecked();
});

test('la galería no gasta una petición con el filtro equivocado', async ({ page, context }) => {
    await context.addCookies([{
        name: 'pio_prefs',
        value: '{"condition":"all","format":"digital","international":true}',
        path: '/',
        domain: 'localhost',
    }]);
    const calls = collectGalleryCalls(page);

    await page.goto('/search');
    // `networkidle` no basta: el fetch del cliente espera a `ready` (la lectura
    // de la cookie) y puede arrancar después, dejando el test en cero llamadas
    // sin que nada esté roto. Se espera a que la galería pida de verdad.
    await expect.poll(() => calls.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle');

    // Lo que importa no es cuántas —el StrictMode de `next dev` duplica los
    // efectos— sino que ninguna salga sin el filtro: eso delata un `!ready`
    // roto o una dependencia olvidada en el efecto.
    for (const url of calls) expect(url).toContain('condition=digital');
});

test('cambiar el formato desde una landing vuelve a pedir la galería', async ({ page }) => {
    /* Regresión: la landing se sirve en "modo estático" y cortaba tanto el
       fetch como el render, así que el toggle del navbar no hacía nada ahí. Y
       arreglar solo el fetch gastaba la petición para seguir pintando el HTML
       viejo, que es peor. */
    await page.goto('/juegos/ps5');

    const request = page.waitForRequest(
        (r) => r.url().includes('/api/games/?') && r.url().includes('condition=digital'),
    );
    await pickFormat(page, 'Digital');
    expect(await request).toBeTruthy();
});
