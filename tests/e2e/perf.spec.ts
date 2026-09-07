import { test, expect, type Page } from '@playwright/test';

import { POLICY_VERSION } from '../../src/lib/consent';

/**
 * El beacon de tiempos de carga (`POST /api/rum/`).
 *
 * Se escucha con `page.on('request')` y no con `page.route`, por lo mismo que
 * en `tracking.spec.ts`: sale por `navigator.sendBeacon` y el listener lo ve
 * sin interferir con el envío. El cuerpo es multipart, así que basta con
 * buscar los valores dentro del texto crudo.
 */
function collectPageLoads(page: Page): string[] {
    const bodies: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/rum/')) {
            bodies.push(request.postData() ?? '');
        }
    });
    return bodies;
}

/** El beacon solo sale al ocultarse la página: LCP e INP no son definitivos
 *  hasta entonces, así que enviarlos antes daría cifras optimistas. */
async function hidePage(page: Page): Promise<void> {
    // El tracker espera al flag `ready` de ConsentContext, que se resuelve en
    // un efecto tras montar. Ocultar antes de eso no envía nada — y es el
    // comportamiento correcto: sin la preferencia leída no se puede medir.
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
    });
}

test('emite un beacon de tiempos al ocultarse la página', async ({ page }) => {
    const loads = collectPageLoads(page);

    await page.goto('/about');
    // Sin esto no debería haber salido nada todavía.
    expect(loads).toHaveLength(0);

    await hidePage(page);
    await expect.poll(() => loads.length).toBeGreaterThan(0);
    expect(loads[0]).toContain('/about');
    expect(loads[0]).toContain('ttfb_ms');
});

test('manda un solo beacon por carga, aunque la página se oculte varias veces', async ({ page }) => {
    const loads = collectPageLoads(page);

    await page.goto('/about');
    await hidePage(page);
    await expect.poll(() => loads.length).toBe(1);

    await hidePage(page);
    await page.waitForTimeout(300);
    expect(loads).toHaveLength(1);
});

test('la ruta viaja como plantilla, no con el slug del juego', async ({ page }) => {
    // Sin colapsar, cada uno de los ~9.800 juegos abriría su propia fila y
    // medir "por página" no agruparía nada.
    const loads = collectPageLoads(page);

    await page.goto('/juego/algun-juego-1');
    await hidePage(page);

    await expect.poll(() => loads.length).toBeGreaterThan(0);
    expect(loads[0]).toContain('/juego/[slug]');
    expect(loads[0]).not.toContain('algun-juego-1');
});

test('el servidor inyecta el identificador de la navegación en el HTML', async ({ page }) => {
    await page.goto('/about');
    const payload = await page.evaluate(() => {
        const el = document.getElementById('pio-perf');
        return el?.textContent ? JSON.parse(el.textContent) : null;
    });

    expect(payload).not.toBeNull();
    // 32 hex: lo que une esta carga con lo que midió Django al servirla.
    expect(payload.nav_id).toMatch(/^[0-9a-f]{32}$/);
    // La marca de generación es lo que distingue un render fresco de un
    // acierto de caché de ISR, donde el HTML —y este identificador— son viejos.
    expect(Date.parse(payload.rendered_at)).not.toBeNaN();
});

test('el beacon no lo rechaza el backend', async ({ page }) => {
    // Las métricas del navegador llegan con decimales y el backend las guarda
    // como enteros: sin redondear, TODOS los beacons se perdían con un 400 que
    // `sendBeacon` no puede leer. Un 2xx aquí es lo único que lo demuestra.
    const statuses: number[] = [];
    page.on('response', (r) => {
        if (r.url().includes('/api/rum/')) statuses.push(r.status());
    });

    await page.goto('/about');
    await hidePage(page);

    await expect.poll(() => statuses.length).toBeGreaterThan(0);
    expect(statuses[0]).toBeLessThan(300);
});

test('no se mide el panel interno', async ({ page }) => {
    const loads = collectPageLoads(page);

    await page.goto('/staff');
    await hidePage(page);
    await page.waitForTimeout(500);

    expect(loads).toHaveLength(0);
});

test('con la medición rechazada no sale ningún beacon', async ({ page, context }) => {
    // Mismo opt-out que apaga `trackEvent`: una sola preferencia gobierna las
    // dos cosas, para que no puedan divergir.
    // `parseConsent` descarta la cookie si `v` no es la versión vigente o si
    // `analytics` no es booleano: una cookie mal formada equivale a "sin
    // decisión", que mide por defecto — y el test pasaría por lo contrario de
    // lo que dice comprobar.
    await context.addCookies([{
        name: 'pio_consent',
        value: JSON.stringify({
            v: POLICY_VERSION,
            analytics: false,
            measure: false,
            ts: new Date().toISOString(),
        }),
        url: `http://localhost:${process.env.FRONTEND_PORT ?? '3001'}`,
    }]);
    const loads = collectPageLoads(page);

    await page.goto('/about');
    await hidePage(page);
    await page.waitForTimeout(500);

    expect(loads).toHaveLength(0);
});
