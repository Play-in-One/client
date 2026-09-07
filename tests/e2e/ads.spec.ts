import { test, expect, type Page } from '@playwright/test';

/**
 * Bloque de Google AdSense al pie de la ficha de juego.
 *
 * La mayoría de estos tests necesitan que el servidor de desarrollo se haya
 * arrancado con un ID de editor. Con uno falso basta: lo que se comprueba es
 * lo que hace PIO —qué se renderiza, a quién y con qué señal de
 * personalización—, no lo que devuelve Google.
 *
 *   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000 \
 *   NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER=0000000000 \
 *   npm run dev
 *
 * Sin esas variables, el bloque no existe y los tests que lo requieren se
 * saltan. La detección se hace mirando la página, no `process.env`: el
 * servidor puede haberse arrancado aparte (`reuseExistingServer`) y con otra
 * configuración que la del proceso que corre Playwright.
 */

const GOOGLE_ADS = /pagead2\.googlesyndication\.com/;
const holder = (page: Page) => page.locator('[data-ad-slot-holder]');

/** Corta la petición al script de Google: ningún test debe salir a la red. */
async function stubGoogle(page: Page): Promise<string[]> {
    const requested: string[] = [];
    await page.route(GOOGLE_ADS, (route) => {
        requested.push(route.request().url());
        // Un cuerpo vacío deja `window.adsbygoogle` como el array-cola que ya
        // creamos, sin la librería que lo procesaría. Es justo lo que hace
        // falta para leer la señal sin que nada externo la pise.
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
    });
    return requested;
}

/** Baja hasta el final: el anuncio no se pide hasta acercarse al viewport. */
async function scrollToBottom(page: Page) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
}

async function adsConfigured(page: Page): Promise<boolean> {
    await page.goto('/game/1');
    return (await holder(page).count()) > 0;
}

test('sin ID de editor no se pide absolutamente nada a Google', async ({ page }) => {
    // El estado por defecto del repo y de cualquier entorno local. Si alguien
    // deja un ca-pub- escrito a mano en el código, este test lo caza.
    const requested = await stubGoogle(page);
    await page.goto('/game/1');

    test.skip(await holder(page).count() > 0, 'hay un ID de editor configurado');

    await scrollToBottom(page);
    await page.waitForTimeout(700);

    expect(requested).toEqual([]);
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
});

test('el hueco reserva su alto desde el primer render', async ({ page }) => {
    // El proyecto mide Core Web Vitals reales (PerfTracker): un anuncio que
    // empuja el contenido al llegar sale en las cifras de CLS.
    await stubGoogle(page);
    test.skip(!(await adsConfigured(page)), 'sin ID de editor no hay bloque');

    const box = await holder(page).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(100);
});

test('no se pide anuncio desde el EEE', async ({ page }) => {
    // Servir publicidad ahí exigiría un CMP certificado del TCF. En vez de
    // montarlo, el bloque no se renderiza para esos países.
    const requested = await stubGoogle(page);
    await page.setExtraHTTPHeaders({ 'CF-IPCountry': 'DE' });

    await page.goto('/game/1');
    await scrollToBottom(page);
    await page.waitForTimeout(700);

    await expect(holder(page)).toHaveCount(0);
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
    expect(requested).toEqual([]);
});

test('desde Chile sí se renderiza el bloque', async ({ page }) => {
    // La otra mitad del test anterior: sin esta, un bug que ocultara el anuncio
    // en todas partes pasaría por «geo-bloqueo que funciona».
    await stubGoogle(page);
    test.skip(!(await adsConfigured(page)), 'sin ID de editor no hay bloque');

    await page.setExtraHTTPHeaders({ 'CF-IPCountry': 'CL' });
    await page.goto('/game/1');

    await expect(holder(page)).toHaveCount(1);
});

test('sin decisión, el anuncio se pide sin personalizar', async ({ page }) => {
    await stubGoogle(page);
    test.skip(!(await adsConfigured(page)), 'sin ID de editor no hay bloque');

    await scrollToBottom(page);

    // 1 = non-personalized ads. Es lo que ve la persona que todavía tiene el
    // aviso de cookies en pantalla.
    await expect
        .poll(() => page.evaluate(() => window.adsbygoogle?.requestNonPersonalizedAds))
        .toBe(1);
});

test('tras aceptar, el anuncio se pide personalizado', async ({ page }) => {
    await stubGoogle(page);
    test.skip(!(await adsConfigured(page)), 'sin ID de editor no hay bloque');

    await page.getByRole('button', { name: 'Aceptar' }).click();
    // Se espera a `pio_consent`, no a `pio_vid`: el eje publicitario es
    // independiente de la analítica, y sin VISITOR_ID_SECRET configurado la
    // cookie de visitante no se emite aunque el consentimiento sí exista.
    await expect.poll(async () => {
        const cookies = await page.context().cookies();
        const raw = cookies.find((cookie) => cookie.name === 'pio_consent')?.value;
        return raw ? JSON.parse(decodeURIComponent(raw)).ads : undefined;
    }).toBe(true);

    // Recarga: la señal se fija en el momento de pedir el anuncio, y el de esta
    // página ya se pidió antes de que existiera la decisión.
    await page.reload();
    await scrollToBottom(page);

    await expect
        .poll(() => page.evaluate(() => window.adsbygoogle?.requestNonPersonalizedAds))
        .toBe(0);
});
