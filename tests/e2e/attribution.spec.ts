import { test, expect, type Page } from '@playwright/test';

/**
 * Origen de la visita (src/lib/attribution.ts) y Google Analytics
 * (src/components/GoogleAnalytics.tsx).
 *
 * Los beacons se leen con `page.on('request')`, igual que en tracking.spec:
 * salen por sendBeacon como multipart, así que basta con buscar en el texto.
 */
function collectEvents(page: Page): string[] {
    const bodies: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/events/')) {
            bodies.push(request.postData() ?? '');
        }
    });
    return bodies;
}

/** El valor de un campo multipart dentro del cuerpo crudo, o null. */
function field(body: string, name: string): string | null {
    const match = body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`));
    return match ? match[1] : null;
}

function pageView(bodies: string[], path: string): string | undefined {
    return bodies.find((body) => field(body, 'event_type') === 'page_view' && field(body, 'page_path') === path);
}

test('los eventos llevan las etiquetas UTM y el tipo de click ID, no su valor', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/about?utm_source=instagram&utm_medium=social&utm_campaign=bio&fbclid=IwAR0secreto');
    await expect.poll(() => pageView(events, '/about')).toBeTruthy();

    const body = pageView(events, '/about')!;
    expect(field(body, 'attr_utm_source')).toBe('instagram');
    expect(field(body, 'attr_utm_medium')).toBe('social');
    expect(field(body, 'attr_utm_campaign')).toBe('bio');
    expect(field(body, 'attr_click')).toBe('fbclid');
    // El valor del clic identifica a la persona ante la red publicitaria.
    expect(body).not.toContain('IwAR0secreto');
});

test('la atribución sobrevive a una recarga sin UTM en la misma pestaña', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/about?utm_source=tiktok&utm_medium=social&utm_campaign=bio');
    await expect.poll(() => pageView(events, '/about')).toBeTruthy();

    await page.goto('/terms');
    await expect.poll(() => pageView(events, '/terms')).toBeTruthy();
    expect(field(pageView(events, '/terms')!, 'attr_utm_source')).toBe('tiktok');
});

test('del referrer externo solo viaja el host', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/about', { referer: 'https://www.google.cl/search?q=mi+correo%40ejemplo.cl' });
    await expect.poll(() => pageView(events, '/about')).toBeTruthy();

    const body = pageView(events, '/about')!;
    expect(field(body, 'attr_ref')).toBe('google.cl');
    expect(body).not.toContain('correo');
});

test('una llegada directa no manda atribución', async ({ page }) => {
    const events = collectEvents(page);

    await page.goto('/about');
    await expect.poll(() => pageView(events, '/about')).toBeTruthy();

    const body = pageView(events, '/about')!;
    expect(body).not.toContain('attr_');
});

test.describe('Google Analytics', () => {
    /** Nunca se deja salir la petición real a Google desde un test. */
    function watchGtag(page: Page): string[] {
        const requests: string[] = [];
        page.route(/googletagmanager\.com/, (route) => {
            requests.push(route.request().url());
            return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
        });
        return requests;
    }

    test('no se descarga sin aceptar la analítica', async ({ page }) => {
        const gtag = watchGtag(page);

        await page.goto('/');
        await expect(page.getByRole('dialog', { name: 'Preferencias de cookies' })).toBeVisible();
        await page.waitForTimeout(500);
        expect(gtag).toHaveLength(0);

        await page.getByRole('button', { name: 'Solo esenciales' }).click();
        await page.goto('/about');
        await page.waitForTimeout(500);
        expect(gtag).toHaveLength(0);
    });

    // El ID se hornea en el build del frontend: solo se puede comprobar contra
    // un servidor arrancado con NEXT_PUBLIC_GA_MEASUREMENT_ID. Quien lo lance
    // así declara E2E_GA=1.
    test('se carga tras «Aceptar todo», y nunca en /staff', async ({ page }) => {
        test.skip(!process.env.E2E_GA, 'frontend sin NEXT_PUBLIC_GA_MEASUREMENT_ID');
        const gtag = watchGtag(page);

        await page.goto('/');
        await page.getByRole('button', { name: 'Aceptar todo' }).click();
        await expect.poll(() => gtag.length).toBeGreaterThan(0);
        expect(gtag[0]).toMatch(/gtag\/js\?id=G-/);

        const before = gtag.length;
        await page.goto('/staff');
        await expect(page.getByRole('heading', { name: 'Acceso administrador' })).toBeVisible();
        await page.waitForTimeout(500);
        expect(gtag).toHaveLength(before);
    });

    test('revocar en /cookies apaga la medición sin recargar', async ({ page }) => {
        test.skip(!process.env.E2E_GA, 'frontend sin NEXT_PUBLIC_GA_MEASUREMENT_ID');
        const gtag = watchGtag(page);
        const disabled = () => page.evaluate(() => {
            const flags = window as unknown as Record<string, unknown>;
            return Object.keys(flags).some((key) => key.startsWith('ga-disable-G-') && flags[key] === true);
        });

        await page.goto('/cookies');
        await page.getByRole('button', { name: 'Aceptar todo' }).click();
        await expect.poll(() => gtag.length).toBeGreaterThan(0);
        expect(await disabled()).toBe(false);

        // El script ya cargado no se puede descargar: lo corta la bandera oficial.
        await page.getByText('Recordar mi navegador para saber si vuelvo').click();
        await expect.poll(disabled).toBe(true);
    });
});
