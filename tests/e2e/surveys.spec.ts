import { test, expect, type Page } from '@playwright/test';
import { SEEDED } from './helpers';

/**
 * Encuestas.
 *
 * El botón flotante pide la lista desde el navegador, así que aquí se mockea
 * y los datos son fijos. /encuestas en cambio se pinta en el servidor: esos
 * tests usan lo que siembra `seed_e2e`.
 */

const question = (id: number, kind: string, prompt: string, extra: Record<string, unknown> = {}) => ({
    id, kind, prompt, help_text: '', required: true,
    slider_min: 1, slider_max: 10, slider_step: 1, slider_min_label: 'Nada', slider_max_label: 'Mucho',
    text_max_length: 200, choices: [], ...extra,
});

const MOCK_SURVEYS = [
    {
        id: 910003, title: 'E2E Mock Silenciosa', description: '', allow_comment: false,
        comment_prompt: '', published_at: '2026-09-29T12:00:00Z', is_quiet: true,
        questions: [question(31, 'text', '¿Algo?')],
    },
    {
        id: 910002, title: 'E2E Mock Nueva', description: 'La más reciente.', allow_comment: true,
        comment_prompt: '¿Algo más?', published_at: '2026-09-28T12:00:00Z', is_quiet: false,
        questions: [
            question(21, 'single', '¿Qué consola usas más?', { choices: [{ id: 211, label: 'PS5' }, { id: 212, label: 'Switch' }] }),
            question(22, 'slider', '¿Qué tan útil te parece?'),
        ],
    },
    {
        id: 910001, title: 'E2E Mock Anterior', description: '', allow_comment: false,
        comment_prompt: '', published_at: '2026-09-20T12:00:00Z', is_quiet: false,
        questions: [question(11, 'text', '¿Qué juego te gustaría ver?')],
    },
];

// La API puede estar en otro origen que la página: sin estas cabeceras el
// navegador descartaría la respuesta simulada por CORS.
const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
};

async function mockSurveys(page: Page): Promise<string[]> {
    const posted: string[] = [];
    await page.route(/\/api\/surveys\/$/, (route) => route.fulfill({ json: MOCK_SURVEYS, headers: CORS }));
    await page.route(/\/api\/surveys\/\d+\/responses\/$/, async (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        posted.push(route.request().postData() ?? '');
        return route.fulfill({ status: 201, json: { id: 1 }, headers: CORS });
    });
    return posted;
}

const surveyButton = (page: Page) => page.getByRole('button', { name: 'Responder encuesta' });

test('el botón abre la encuesta pendiente más reciente, no la silenciosa', async ({ page }) => {
    await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    await expect(page.getByRole('dialog', { name: 'E2E Mock Nueva' })).toBeVisible();
});

test('no deja enviar sin las preguntas obligatorias', async ({ page }) => {
    const posted = await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    await page.getByRole('button', { name: 'Enviar respuestas' }).click();
    // Las dos preguntas obligatorias (radio y slider) quedan marcadas con el
    // mismo mensaje de error.
    await expect(page.getByText('Esta pregunta es obligatoria.')).toHaveCount(2);
    expect(posted).toHaveLength(0);
});

test('responder oculta el botón y al volver aparece la siguiente', async ({ page }) => {
    const posted = await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await dialog.getByLabel('PS5').check();
    await dialog.getByRole('slider', { name: '¿Qué tan útil te parece?' }).focus();
    await page.keyboard.press('ArrowRight');
    await dialog.getByLabel('¿Algo más?').fill('Muy bueno');
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();

    await expect(dialog.getByText('¡Gracias por responder!')).toBeVisible();
    const body = JSON.parse(posted[0]);
    expect(body.answers).toEqual([
        { question: 21, choices: [211] },
        { question: 22, value: 7 }, // arranca al medio (6) y la flecha suma un paso
    ]);
    expect(body.comment).toBe('Muy bueno');

    await page.keyboard.press('Escape');
    await expect(surveyButton(page)).toBeHidden();
    const stored = await page.evaluate(() => localStorage.getItem('pio_surveys_answered'));
    expect(JSON.parse(stored ?? '[]')).toContain(910002);

    await page.reload();
    await surveyButton(page).click();
    await expect(page.getByRole('dialog', { name: 'E2E Mock Anterior' })).toBeVisible();
});

test('sin encuestas pendientes no hay botón', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pio_surveys_answered', '[910001,910002]'));
    await mockSurveys(page);
    // No `networkidle`: el websocket de HMR del dev server nunca lo deja llegar.
    const listed = page.waitForResponse(/\/api\/surveys\/$/);
    await page.goto('/');
    await listed;
    await expect(surveyButton(page)).toBeHidden();
});

test('el globo aparece tras un rato sin actividad', async ({ page }) => {
    await page.clock.install();
    await mockSurveys(page);
    await page.goto('/');
    await expect(surveyButton(page)).toBeVisible();
    await page.clock.fastForward(21_000);
    await expect(page.getByText('¿Nos ayudas con una encuesta de 1 minuto?')).toBeVisible();
});

test('el aviso de cookies queda a la izquierda y el botón a la derecha', async ({ page }) => {
    await mockSurveys(page);
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: 'Preferencias de cookies' });
    await expect(banner).toBeVisible();
    const viewport = page.viewportSize()!;
    const bannerBox = (await banner.boundingBox())!;
    const buttonBox = (await surveyButton(page).boundingBox())!;
    expect(bannerBox.x).toBeLessThan(viewport.width / 2);
    expect(buttonBox.x).toBeGreaterThan(viewport.width / 2);
});

test('/encuestas lista abiertas y silenciosas, no cerradas ni borradores', async ({ page }) => {
    const { newest, previous, quiet, closed, draft } = SEEDED.surveys;
    await page.goto('/encuestas');
    for (const s of [newest, previous, quiet]) {
        await expect(page.getByRole('article', { name: s.title })).toBeVisible();
    }
    for (const s of [closed, draft]) {
        await expect(page.getByRole('article', { name: s.title })).toHaveCount(0);
    }
    // En /encuestas no se superpone el botón flotante.
    await expect(surveyButton(page)).toBeHidden();
});

test('/encuestas marca como respondida la que ya contestaste', async ({ page }) => {
    const { previous } = SEEDED.surveys;
    await page.addInitScript((id) => localStorage.setItem('pio_surveys_answered', JSON.stringify([id])), previous.id);
    await page.goto('/encuestas');
    const card = page.getByRole('article', { name: previous.title });
    await expect(card.getByText('Respondida')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Responder' })).toHaveCount(0);
});
