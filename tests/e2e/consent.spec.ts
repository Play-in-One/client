import { test, expect, type Page } from '@playwright/test';

/**
 * Flujo de consentimiento.
 *
 * Cada test arranca sin cookies (Playwright aísla el contexto por test), así
 * que todos parten de una primera visita.
 */

async function cookieValue(page: Page, name: string): Promise<string | undefined> {
    const cookies = await page.context().cookies();
    return cookies.find((cookie) => cookie.name === name)?.value;
}

const banner = (page: Page) => page.getByRole('dialog', { name: 'Preferencias de cookies' });

test('el aviso aparece en la primera visita', async ({ page }) => {
    await page.goto('/');
    await expect(banner(page)).toBeVisible();
    // Rechazar debe costar lo mismo que aceptar: ambos son un botón visible.
    await expect(page.getByRole('button', { name: 'Aceptar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solo lo esencial' })).toBeVisible();
});

test('el aviso no aparece en las rutas de administración', async ({ page }) => {
    // Es tráfico propio y no se mide (ver PageViewTracker), así que preguntar
    // ahí no tiene sentido y además el banner tapa el dashboard.
    await page.goto('/staff');
    await expect(page.getByRole('heading', { name: 'Acceso administrador' })).toBeVisible();
    await expect(banner(page)).toBeHidden();
});

test('aceptar guarda la cookie de visitante y no vuelve a preguntar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(banner(page)).toBeHidden();
    await expect.poll(() => cookieValue(page, 'pio_vid')).toBeTruthy();

    // El identificador va firmado: <uuid>.<firma de 32 hex>
    const token = await cookieValue(page, 'pio_vid');
    expect(token).toMatch(/^[0-9a-f-]{36}\.[0-9a-f]{32}$/);

    await page.reload();
    await expect(banner(page)).toBeHidden();
});

test('«solo lo esencial» no deja cookie de visitante', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Solo lo esencial' }).click();

    await expect(banner(page)).toBeHidden();
    await expect.poll(() => cookieValue(page, 'pio_consent')).toBeTruthy();
    expect(await cookieValue(page, 'pio_vid')).toBeUndefined();

    await page.reload();
    await expect(banner(page)).toBeHidden();
});

test('el identificador sobrevive a la navegación y viaja en los eventos', async ({ page }) => {
    const beacons: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/events/')) {
            beacons.push(request.postData() ?? '');
        }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    // Esperar a que exista: la cookie llega con la respuesta del fetch, no con
    // el clic, y leerla antes devuelve undefined.
    await expect.poll(() => cookieValue(page, 'pio_vid')).toBeTruthy();
    const token = await cookieValue(page, 'pio_vid');

    await page.goto('/about');
    await expect.poll(() => beacons.some((b) => b.includes(token!))).toBe(true);
});

test('sin aceptar, los eventos salen sin identificador', async ({ page }) => {
    const beacons: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/events/')) {
            beacons.push(request.postData() ?? '');
        }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Solo lo esencial' }).click();
    await page.goto('/about');

    // El evento se envía igual (lo cuenta el nivel anónimo del servidor), pero
    // sin nada que identifique al navegador.
    await expect.poll(() => beacons.some((b) => b.includes('/about'))).toBe(true);
    expect(beacons.some((b) => b.includes('visitor_id'))).toBe(false);
});

test('el panel de /cookies revoca el consentimiento', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect.poll(() => cookieValue(page, 'pio_vid')).toBeTruthy();

    await page.goto('/cookies');
    // El input del Switch de Mantine está visualmente oculto; se pulsa el label,
    // que es lo que hace una persona.
    await page.getByText('Recordar mi navegador para saber si vuelvo').click();

    await expect.poll(() => cookieValue(page, 'pio_vid')).toBeUndefined();
});

test('«borrar mis datos» limpia las cookies y el aviso reaparece', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect.poll(() => cookieValue(page, 'pio_vid')).toBeTruthy();

    await page.goto('/cookies');
    await page.getByRole('button', { name: 'Borrar mis datos' }).click();

    await expect(page.getByText(/vuelve a ser anónimo/)).toBeVisible();
    await expect.poll(() => cookieValue(page, 'pio_vid')).toBeUndefined();
    await expect.poll(() => cookieValue(page, 'pio_consent')).toBeUndefined();

    await page.goto('/');
    await expect(banner(page)).toBeVisible();
});

test('el desactivar total corta los eventos por completo', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Solo lo esencial' }).click();
    await page.goto('/cookies');
    await page.getByText('Contarme en las estadísticas anónimas').click();

    const beacons: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/events/')) {
            beacons.push(request.postData() ?? '');
        }
    });

    await page.goto('/about');
    await page.waitForTimeout(700);
    expect(beacons).toHaveLength(0);
});

test('el desactivar total también corta los eventos de las páginas de detalle', async ({ page }) => {
    // El test de arriba solo visita /about, que no tiene más tracker que el
    // page_view del layout. Las fichas de juego y de blog emiten desde un
    // efecto propio, y esos se adelantaban a ConsentContext: en carga en frío
    // el evento salía aunque la medición estuviera apagada.
    await page.goto('/');
    await page.getByRole('button', { name: 'Solo lo esencial' }).click();
    await page.goto('/cookies');
    await page.getByText('Contarme en las estadísticas anónimas').click();

    const beacons: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/events/')) {
            beacons.push(request.url());
        }
    });

    for (const path of ['/game/1', '/blog/1', '/search?platform=ps5']) {
        await page.goto(path);
        await page.waitForTimeout(700);
    }
    expect(beacons).toEqual([]);
});

test('el primer evento de una ficha en frío ya lleva el identificador de visitante', async ({ page }) => {
    // La otra cara del mismo defecto: si el game_view se adelanta, sale sin
    // `visitor_id` y el backend lo agrupa bajo el hash anónimo — la misma
    // persona cuenta dos veces en el mismo día.
    await page.goto('/');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect.poll(() => cookieValue(page, 'pio_vid')).toBeTruthy();

    const bodies: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/events/')) {
            bodies.push(request.postData() ?? '');
        }
    });

    await page.goto('/game/1');
    // El game_view tiene que estar Y tiene que ir identificado. Las dos mitades
    // importan y se protegen entre sí: `measurementEnabled` arranca apagado (así
    // un tracker despistado no se salta el opt-out) y los trackers esperan a
    // `ready` (así ese mismo tracker no pierde su evento contra el cerrojo).
    // Este test cae si se rompe cualquiera de las dos.
    await expect.poll(() => bodies.filter((b) => b.includes('game_view')).length)
        .toBeGreaterThan(0);
    for (const body of bodies) expect(body).toContain('visitor_id');
});
