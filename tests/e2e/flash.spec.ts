import { test, expect } from '@playwright/test';

/* Reproduce el bug con red lenta: sin throttling la ventana del flash es tan
   corta que un test podría no verla y dar un falso OK. */
const OFF = { name: 'pio_prefs', value: '{"condition":"all","international":false}', path: '/', domain: 'localhost' };

for (const path of ['/game/1', '/', '/saved']) {
    test(`sin flash en ${path}`, async ({ page, context }) => {
        test.setTimeout(120_000);
        await context.addCookies([OFF]);
        const client = await context.newCDPSession(page);
        await client.send('Network.emulateNetworkConditions', {
            offline: false, latency: 300, downloadThroughput: 3_000_000 / 8, uploadThroughput: 1_000_000 / 8,
        });

        // Vigila desde el primer instante: si la marca de tienda internacional
        // llega a estar VISIBLE alguna vez, queda registrado.
        await page.addInitScript(() => {
            (window as any).__seen = 0;
            const check = () => {
                for (const el of document.querySelectorAll('[aria-label="Tienda internacional"]')) {
                    const r = (el as HTMLElement).getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) (window as any).__seen++;
                }
            };
            const start = () => { check(); new MutationObserver(check).observe(document.body, { childList: true, subtree: true }); };
            if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
        });

        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        expect(await page.evaluate(() => (window as any).__seen)).toBe(0);
    });
}

/* La dimensión nueva de los prefs tiene su propio caso, y no por simetría: el
 * script inline del <head> lleva un allowlist LITERAL de qué preferencias
 * cuentan como "desviada del default", y olvidarse de añadir `format` ahí no
 * rompe nada visible —simplemente el anti-flash deja de activarse—.
 *
 * Se ejecuta el script REAL extraído del HTML servido, en vez de intentar cazar
 * el instante en que marca el documento: esa ventana dura lo que tarda la
 * hidratación, y un test que la persigue mide la velocidad de la máquina, no el
 * allowlist. Aquí el sujeto es la única línea que puede olvidarse. */
test('el script del <head> reconoce el formato como desviación del default', async ({ page }) => {
    const html = await (await page.goto('/'))!.text();

    // El mismo script que va inline en el <head>, tal cual lo sirve el servidor.
    const script = html.match(/\(function\(\)\{try\{[\s\S]*?\}catch\(_\)\{\}\}\)\(\)/)?.[0];
    expect(script, 'no se encontró el script de preferencias en el HTML').toBeTruthy();

    const marcaCon = (prefs: string) => page.evaluate(
        ([src, value]) => {
            document.documentElement.removeAttribute('data-prefs');
            document.cookie = `pio_prefs=${encodeURIComponent(value)}; path=/`;
            // eslint-disable-next-line no-eval
            eval(src);
            const marcado = document.documentElement.getAttribute('data-prefs') === 'pending';
            document.documentElement.removeAttribute('data-prefs');
            return marcado;
        },
        [script!, prefs] as const,
    );

    // El caso que este cambio añade.
    expect(await marcaCon('{"condition":"all","format":"digital","international":true}')).toBe(true);
    expect(await marcaCon('{"condition":"all","format":"physical","international":true}')).toBe(true);
    // Los que ya existían, como control: si estos fallaran, el test de arriba
    // estaría pasando por un motivo equivocado.
    expect(await marcaCon('{"condition":"used","format":"all","international":true}')).toBe(true);
    expect(await marcaCon('{"condition":"all","format":"all","international":false}')).toBe(true);
    // Y el default no marca nada: para la mayoría la página pinta como siempre.
    expect(await marcaCon('{"condition":"all","format":"all","international":true}')).toBe(false);
});
