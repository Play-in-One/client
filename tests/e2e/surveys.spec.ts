import { test, expect, type Locator, type Page } from '@playwright/test';
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
        invitation_message: 'Cuéntanos qué consola te gustaría comparar en PIO.',
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
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
};

test('el panel muestra métricas y respuestas incompletas y permite actualizarlas', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('pio_admin_token', 'e2e-mock-token');
        localStorage.setItem('pio_admin_user', 'e2e');
    });
    const survey = { ...MOCK_SURVEYS[1], status: 'open', response_count: 3, click_count: 4 };
    const metrics = {
        click_count: 4, started_count: 3, completed_count: 1, abandoned_count: 1, active_count: 1,
        abandonment_rate: 50, average_completion_seconds: 75,
        abandonment_by_question: [{ question: 21, prompt: '¿Qué consola usas más?', count: 1 },
            { question: null, prompt: 'Comentario final', count: 0 }],
    };
    let reads = 0;
    await page.route(/\/api\/surveys\/staff\/$/, (route) => route.fulfill(
        route.request().method() === 'OPTIONS' ? { status: 204, headers: CORS } : { json: [survey], headers: CORS },
    ));
    await page.route(/\/api\/surveys\/910002\/results\/$/, (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        reads++;
        return route.fulfill({ json: { survey, metrics: { ...metrics, click_count: reads === 1 ? 4 : 5 },
            questions: [], comments: [{ text: 'Comentario sin enviar', created_at: '2026-10-01T12:00:00Z' }] }, headers: CORS });
    });
    await page.goto('/staff/encuestas');
    await expect(page.getByText('1 min 15 s', { exact: true })).toBeVisible();
    await expect(page.getByText('50%', { exact: true })).toBeVisible();
    await expect(page.getByText('Comentario sin enviar', { exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: '¿Qué consola usas más?' }).getByRole('cell').last()).toHaveText('1');
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(page.locator('.mantine-Card-root').filter({ hasText: 'Clics para abrir' })).toContainText('5');
    expect(reads).toBe(2);
});

test('un error de autoguardado se reintenta conservando las respuestas', async ({ page }) => {
    await mockSurveys(page);
    let failing = true;
    const saved: { answers: { question: number; choices?: number[] }[] }[] = [];
    await page.route(/\/api\/surveys\/\d+\/draft\/$/, (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        const payload = route.request().postDataJSON();
        if (failing) return route.fulfill({ status: 503, json: {}, headers: CORS });
        saved.push(payload);
        return route.fulfill({ json: { id: 1, revision: payload.revision }, headers: CORS });
    });
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await dialog.getByLabel('PS5').check();
    await expect(dialog.getByRole('status').filter({ hasText: 'No se pudo guardar' })).toBeVisible();
    failing = false;
    await nextStep(dialog);
    await expect(dialog.getByRole('status').filter({ hasText: 'Guardado automáticamente' })).toBeVisible();
    expect(saved.at(-1)?.answers).toContainEqual({ question: 21, choices: [211] });
});

test('ocultar la pestaña guarda sin declarar cierre y el heartbeat conserva la inactividad', async ({ page }) => {
    await mockSurveys(page);
    const saved: { paused: boolean; inactive_ms: number }[] = [];
    await page.route(/\/api\/surveys\/\d+\/draft\/$/, (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        const payload = route.request().postDataJSON();
        saved.push(payload);
        return route.fulfill({ json: { id: 1, revision: payload.revision }, headers: CORS });
    });
    await page.clock.install();
    await page.goto('/');
    await surveyButton(page).click();
    await expect.poll(() => saved.length).toBeGreaterThan(0);
    await page.clock.fastForward(31 * 60000);
    await expect.poll(() => saved.some((p) => p.inactive_ms >= 30 * 60000 && !p.paused)).toBe(true);
    const count = saved.length;
    await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => saved.length).toBeGreaterThan(count);
    expect(saved.at(-1)?.paused).toBe(false);
});

test('un conflicto entre pestañas no marca la encuesta como respondida', async ({ page }) => {
    await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await answerRequiredQuestions(page, dialog);
    const conflict = { status: 409, json: { code: 'draft_conflict', detail: 'Esta encuesta está abierta en otra pestaña. Vuelve a abrirla aquí para continuar.' }, headers: CORS };
    await page.route(/\/api\/surveys\/\d+\/(draft|responses)\/$/, (route) => route.fulfill(
        route.request().method() === 'OPTIONS' ? { status: 204, headers: CORS } : conflict,
    ));
    await dialog.getByLabel('¿Algo más?').fill('Mis respuestas');
    await expect(dialog.getByRole('status').filter({ hasText: 'otra pestaña' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(dialog.getByRole('alert')).toContainText('otra pestaña');
    await expect(dialog.getByLabel('¿Algo más?')).toHaveValue('Mis respuestas');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pio_surveys_answered') ?? '[]'))).not.toContain(910002);
});

test('respuestas de guardado fuera de orden no bloquean la misma pestaña', async ({ page }) => {
    await mockSurveys(page);
    let releaseOld!: () => void;
    let oldHeld = false;
    let latestRevision = 0;
    let savedComment = '';
    await page.route(/\/api\/surveys\/\d+\/draft\/$/, async (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        const payload = route.request().postDataJSON();
        if (!oldHeld && payload.answers.length > 0) {
            oldHeld = true;
            await new Promise<void>((resolve) => { releaseOld = resolve; });
        }
        latestRevision = Math.max(latestRevision, payload.revision);
        if (payload.comment) savedComment = payload.comment;
        return route.fulfill({ json: { id: 1, revision: latestRevision }, headers: CORS });
    });
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await dialog.getByLabel('PS5').check();
    await expect.poll(() => oldHeld).toBe(true);
    await nextStep(dialog);
    await expect(dialog.getByRole('status').filter({ hasText: 'Guardado automáticamente' })).toBeVisible();
    releaseOld();
    await dialog.getByRole('slider').focus();
    await page.keyboard.press('End');
    await nextStep(dialog);
    await dialog.getByLabel('¿Algo más?').fill('Más reciente');
    await expect.poll(() => savedComment).toBe('Más reciente');
    await expect(dialog.getByRole('status').filter({ hasText: 'Guardado automáticamente' })).toBeVisible();
});

async function mockSurveys(page: Page, surveys = MOCK_SURVEYS): Promise<string[]> {
    const posted: string[] = [];
    await page.route(/\/api\/surveys\/$/, (route) => route.fulfill({ json: surveys, headers: CORS }));
    await page.route(/\/api\/surveys\/\d+\/draft\/$/, (route) => route.fulfill(
        route.request().method() === 'OPTIONS'
            ? { status: 204, headers: CORS }
            : { status: 200, json: { id: 1, revision: route.request().postDataJSON().revision }, headers: CORS },
    ));
    await page.route(/\/api\/surveys\/\d+\/responses\/$/, async (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        posted.push(route.request().postData() ?? '');
        return route.fulfill({ status: 201, json: { id: 1 }, headers: CORS });
    });
    return posted;
}

const surveyButton = (page: Page) => page.getByRole('button', { name: 'Responder encuesta' });

const nextStep = (dialog: Locator) => dialog.getByRole('button', { name: 'Siguiente', exact: true }).click();

async function clickChoiceCard(card: Locator) {
    const box = (await card.boundingBox())!;
    // El margen derecho, lejos del texto y del indicador, también selecciona.
    await card.click({ position: { x: box.width - 4, y: box.height / 2 } });
}

async function answerRequiredQuestions(page: Page, dialog: Locator) {
    await dialog.getByLabel('PS5').check();
    await nextStep(dialog);
    await dialog.getByRole('slider', { name: '¿Qué tan útil te parece?' }).focus();
    await page.keyboard.press('ArrowRight');
    await nextStep(dialog);
}

test('el botón abre la encuesta pendiente más reciente, no la silenciosa', async ({ page }) => {
    await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    await expect(page.getByRole('dialog', { name: 'E2E Mock Nueva' })).toBeVisible();
});

test('la tarjeta de PIO solo aparece en el inicio y muestra el mensaje configurado con hover y foco', async ({ page }) => {
    await mockSurveys(page);
    await page.goto('/');
    const card = surveyButton(page);
    await expect(card.getByText('Tu opinión nos ayuda')).toBeVisible();
    await expect(card.locator('img[src="/PIO.svg"]')).toHaveCount(1);
    await card.hover();
    const message = page.getByRole('tooltip');
    await expect(message).toHaveText('Cuéntanos qué consola te gustaría comparar en PIO.');
    await page.mouse.move(1000, 10);
    await expect(message).toBeHidden();
    await card.focus();
    await expect(message).toBeVisible();
    await page.goto('/cookies');
    await expect(card).toBeHidden();
    await page.goto('/');
    await expect(card).toBeVisible();
});

test('la tarjeta y su mensaje caben en móvil y respetan movimiento reducido', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockSurveys(page, MOCK_SURVEYS.map((s) => ({ ...s, invitation_message: 'MensajeDeInvitaciónLargo'.repeat(12) })));
    await page.goto('/');
    await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
    const card = surveyButton(page);
    await expect(card).toBeVisible();
    expect(await card.evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
    await page.keyboard.press('Tab');
    await card.focus();
    await expect(card).toBeFocused();
    await expect(page.getByRole('tooltip')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const bounds = (await card.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    await expect.poll(async () => {
        const rect = (await card.boundingBox())!;
        return rect.y + rect.height;
    }).toBeLessThanOrEqual(568);
});

test('en una pantalla baja espera a cerrar el aviso de cookies antes de mostrar la tarjeta', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await mockSurveys(page);
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: 'Preferencias de cookies' })).toBeVisible();
    await expect(surveyButton(page)).toBeHidden();
    await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
    await expect(surveyButton(page)).toBeVisible();
});

test('una pregunta por paso valida las obligatorias antes de avanzar', async ({ page }) => {
    const posted = await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await expect(dialog.getByText('Paso 1 de 3')).toBeVisible();
    await expect(dialog.getByText('Obligatoria', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Necesaria para continuar.', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('slider')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Enviar respuestas' })).toHaveCount(0);
    await nextStep(dialog);
    await expect(dialog.getByRole('alert')).toContainText('Selecciona una opción para continuar.');
    await expect(dialog.getByLabel('PS5')).toBeFocused();
    await expect(dialog.getByLabel('PS5')).toHaveAttribute('aria-invalid', 'true');
    expect(await dialog.getByLabel('PS5').getAttribute('aria-describedby')).toBe(await dialog.getByRole('alert').getAttribute('id'));
    await clickChoiceCard(dialog.locator('.mantine-Radio-root').filter({ hasText: 'PS5' }));
    await expect(dialog.getByLabel('PS5')).toBeChecked();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await nextStep(dialog);
    await expect(dialog.getByText('Paso 2 de 3')).toBeVisible();
    await expect(dialog.getByLabel('PS5')).toHaveCount(0);
    await nextStep(dialog);
    await expect(dialog.getByRole('alert')).toContainText('Mueve el control para elegir tu respuesta.');
    await expect(dialog.getByRole('slider')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('slider')).toBeFocused();
    expect(await dialog.getByRole('slider').getAttribute('aria-describedby')).toContain(await dialog.getByRole('alert').getAttribute('id'));
    expect(posted).toHaveLength(0);
});

for (const kind of ['multiple', 'text'] as const) {
    test(`el aviso de ${kind} explica qué falta y se limpia al responder`, async ({ page }) => {
        const prompt = '¿Qué prefieres?';
        await mockSurveys(page, MOCK_SURVEYS.map((s) => s.id === 910002 ? {
            ...s, questions: [question(21, kind, prompt, { choices: [{ id: 211, label: 'PS5' }] })],
        } : s));
        await page.goto('/');
        await surveyButton(page).click();
        const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
        await nextStep(dialog);
        const alert = dialog.getByRole('alert');
        await expect(alert).toContainText(kind === 'multiple'
            ? 'Selecciona al menos una opción para continuar.' : 'Escribe una respuesta para continuar.');
        const input = kind === 'multiple' ? dialog.getByRole('checkbox') : dialog.getByRole('textbox');
        await expect(input).toBeFocused();
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(await input.getAttribute('aria-describedby')).toBe(await alert.getAttribute('id'));
        if (kind === 'multiple') await input.check();
        else await input.fill('PS5');
        await expect(alert).toHaveCount(0);
        await nextStep(dialog);
        await expect(dialog.getByText('Comentario final', { exact: true })).toBeVisible();
    });
}

test('el toast obligatorio no mueve el formulario y desaparece a los cuatro segundos', async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width: 375, height: 480 });
    await mockSurveys(page, MOCK_SURVEYS.map((s) => s.id === 910002 ? {
        ...s, description: 'Queremos conocer tu opinión para mejorar PIO. '.repeat(30),
    } : s));
    await page.goto('/');
    await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    const geometry = () => dialog.evaluate((node) => [...node.querySelectorAll('fieldset, input, button, [role="group"]')]
        .map((element) => {
            const box = element.getBoundingClientRect();
            return [box.x, box.y, box.width, box.height, element.scrollTop];
        }));
    await expect.poll(() => dialog.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
    await page.clock.fastForward(300);
    const before = await geometry();
    await nextStep(dialog);
    const alert = dialog.getByRole('alert');
    await expect(alert).toBeInViewport({ ratio: 1 });
    expect(await geometry()).toEqual(before);
    await expect(dialog.getByRole('button', { name: 'Siguiente', exact: true })).toBeInViewport({ ratio: 1 });
    expect(await dialog.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await page.clock.fastForward(4000);
    await expect(alert).toBeHidden();
    await nextStep(dialog);
    await expect(alert).toBeVisible();
    await page.setViewportSize({ width: 375, height: 320 });
    await expect(alert).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole('button', { name: 'Siguiente', exact: true })).toBeInViewport({ ratio: 1 });
});

test('responder oculta el botón y al volver aparece la siguiente', async ({ page }) => {
    const posted = await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await answerRequiredQuestions(page, dialog);
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

test('un envío exitoso muestra confeti y una barra antes de cerrar a los cinco segundos', async ({ page }) => {
    await page.clock.install();
    await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await answerRequiredQuestions(page, dialog);
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(dialog.getByText('¡Gracias por responder!')).toBeVisible();
    await expect(dialog.locator('[data-survey-confetti]')).toBeVisible();
    const countdown = dialog.getByRole('progressbar', { name: 'Tiempo restante antes de cerrar' });
    await expect(countdown).toBeVisible();
    await page.clock.fastForward(2500);
    await expect(dialog).toBeVisible();
    await expect(countdown).toHaveAttribute('aria-valuenow', '50');
    await page.clock.fastForward(2500);
    await page.clock.fastForward(300); // Transición de salida del modal.
    await expect(dialog).toBeHidden();
});

test('con movimiento reducido conserva la cuenta atrás sin confeti', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockSurveys(page);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await answerRequiredQuestions(page, dialog);
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(dialog.getByText('¡Gracias por responder!')).toBeVisible();
    await expect(dialog.locator('[data-survey-confetti]')).toHaveCount(0);
    await expect(dialog.getByRole('progressbar', { name: 'Tiempo restante antes de cerrar' })).toBeVisible();
});

test('el comentario final siempre aparece, es opcional y retroceder conserva respuestas', async ({ page }) => {
    const surveys = MOCK_SURVEYS.map((s) => ({ ...s, allow_comment: false, comment_prompt: '' }));
    const posted = await mockSurveys(page, surveys);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await answerRequiredQuestions(page, dialog);
    const comment = dialog.getByLabel('¿Algo más que quieras contarnos?');
    await expect(comment).toBeVisible();
    await expect(comment).not.toHaveAttribute('required', '');
    expect(posted).toHaveLength(0);
    await comment.fill('  Mi opinión  ');
    await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(dialog.getByRole('slider')).toHaveAttribute('aria-valuenow', '7');
    await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(dialog.getByLabel('PS5')).toBeChecked();
    await nextStep(dialog);
    await nextStep(dialog);
    await expect(comment).toHaveValue('  Mi opinión  ');
    await comment.fill('   ');
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(dialog.getByText('¡Gracias por responder!')).toBeVisible();
    expect(JSON.parse(posted[0]).comment).toBe('');
});

test('permite omitir preguntas opcionales y conserva selecciones múltiples y texto', async ({ page }) => {
    const surveys = MOCK_SURVEYS.map((s) => s.id === 910002 ? {
        ...s,
        questions: [
            question(41, 'multiple', '¿Dónde compras?', { required: false, choices: [{ id: 411, label: 'A' }, { id: 412, label: 'B' }] }),
            question(42, 'text', '¿Qué juego falta?', { required: false }),
            question(43, 'slider', '¿Algo adicional?', { required: false }),
        ],
    } : s);
    const posted = await mockSurveys(page, surveys);
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    const cardA = dialog.locator('.mantine-Checkbox-root').filter({ hasText: /^A$/ });
    await expect(dialog.getByText('Opcional', { exact: true })).toBeVisible();
    await clickChoiceCard(cardA);
    await expect(dialog.getByLabel('A', { exact: true })).toBeChecked();
    await clickChoiceCard(cardA);
    await expect(dialog.getByLabel('A', { exact: true })).not.toBeChecked();
    await clickChoiceCard(cardA);
    await dialog.getByLabel('B', { exact: true }).check();
    await nextStep(dialog);
    await dialog.getByLabel('¿Qué juego falta?').fill('  Zelda  ');
    await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(dialog.getByLabel('A', { exact: true })).toBeChecked();
    await expect(dialog.getByLabel('B', { exact: true })).toBeChecked();
    await nextStep(dialog);
    await expect(dialog.getByLabel('¿Qué juego falta?')).toHaveValue('  Zelda  ');
    await dialog.getByLabel('¿Qué juego falta?').press('Enter');
    await expect(dialog.getByRole('slider')).toBeVisible();
    await nextStep(dialog);
    await dialog.getByLabel('¿Algo más?').fill('Una recomendación');
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(dialog.getByText('¡Gracias por responder!')).toBeVisible();
    expect(JSON.parse(posted[0]).answers).toEqual([
        { question: 41, choices: [411, 412] },
        { question: 42, text: 'Zelda' },
    ]);
});

test('bloquea la navegación durante el envío y permite reintentar sin perder datos', async ({ page }) => {
    await mockSurveys(page);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let attempts = 0;
    await page.route(/\/api\/surveys\/\d+\/responses\/$/, async (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        attempts += 1;
        if (attempts === 1) {
            await pending;
            return route.fulfill({ status: 503, json: { detail: 'Error temporal' }, headers: CORS });
        }
        return route.fulfill({ status: 201, json: { id: 1 }, headers: CORS });
    });
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await answerRequiredQuestions(page, dialog);
    const comment = dialog.getByLabel('¿Algo más?');
    await comment.fill('Mantener esta opinión');
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(dialog.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled();
    await expect(comment).toBeDisabled();
    await dialog.locator('form').evaluate((form: HTMLFormElement) => {
        form.requestSubmit();
        form.requestSubmit();
    });
    release();
    await expect(dialog.getByRole('alert')).toHaveText('Error temporal');
    expect(attempts).toBe(1);
    await expect(comment).toHaveValue('Mantener esta opinión');
    await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(dialog.getByText('¡Gracias por responder!')).toBeVisible();
    expect(attempts).toBe(2);
});

test('guarda sin enviar y recupera respuestas y paso al reabrir o recargar', async ({ page }) => {
    await mockSurveys(page);
    const saved: Array<Record<string, unknown>> = [];
    await page.route(/\/api\/surveys\/\d+\/draft\/$/, (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        const payload = route.request().postDataJSON();
        saved.push(payload);
        return route.fulfill({ status: 200, json: { id: 1, revision: payload.revision }, headers: CORS });
    });
    await page.goto('/');
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
    await answerRequiredQuestions(page, dialog);
    await dialog.getByLabel('¿Algo más?').fill('Borrador');
    await expect.poll(() => saved.some((payload) => payload.comment === 'Borrador')).toBe(true);
    const token = saved[saved.length - 1].draft_token;
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect.poll(() => saved.some((payload) => payload.paused === true && payload.comment === 'Borrador')).toBe(true);
    await surveyButton(page).click();
    await expect(dialog.getByText('Paso 3 de 3')).toBeVisible();
    await expect(dialog.getByLabel('¿Algo más?')).toHaveValue('Borrador');
    await page.reload();
    await surveyButton(page).click();
    await expect(dialog.getByLabel('¿Algo más?')).toHaveValue('Borrador');
    await expect.poll(() => saved[saved.length - 1].draft_token).toBe(token);
    await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(dialog.getByRole('slider')).toHaveAttribute('aria-valuenow', '7');
    await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(dialog.getByLabel('PS5')).toBeChecked();
});

for (const detail of ['Ya respondiste esta encuesta.', 'Esta encuesta ya está cerrada.']) {
    test(`conserva el tratamiento de 409: ${detail}`, async ({ page }) => {
        await page.clock.install();
        await mockSurveys(page);
        await page.route(/\/api\/surveys\/\d+\/responses\/$/, (route) => route.fulfill(
            route.request().method() === 'OPTIONS'
                ? { status: 204, headers: CORS }
                : { status: 409, json: { detail }, headers: CORS },
        ));
        await page.goto('/');
        await surveyButton(page).click();
        const dialog = page.getByRole('dialog', { name: 'E2E Mock Nueva' });
        await answerRequiredQuestions(page, dialog);
        await dialog.getByLabel('¿Algo más?').fill('Mi opinión');
        await dialog.getByRole('button', { name: 'Enviar respuestas' }).click();
        await expect(dialog.getByRole('heading', { name: detail })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Enviar respuestas' })).toHaveCount(0);
        await expect(dialog.locator('[data-survey-confetti]')).toHaveCount(0);
        if (detail === 'Ya respondiste esta encuesta.') {
            const countdown = dialog.getByRole('progressbar', { name: 'Tiempo restante antes de cerrar' });
            await expect(countdown).toBeVisible();
            await page.clock.fastForward(4000);
            await expect(dialog).toBeVisible();
            await expect(countdown).toHaveAttribute('aria-valuenow', '20');
            await page.clock.fastForward(1000);
            await page.clock.fastForward(300);
            await expect(dialog).toBeHidden();
        }
    });
}

for (const width of [320, 375, 768, 1280]) {
    test(`sin desborde horizontal a ${width}px con etiquetas largas y extremos del slider`, async ({ page }) => {
        await page.setViewportSize({ width, height: 720 });
        const longLabel = 'UnaEtiquetaMuyLargaSinEspacios'.repeat(6);
        const surveys = MOCK_SURVEYS.map((s) => s.id === 910002 ? {
            ...s,
            title: longLabel,
            description: longLabel,
            questions: [question(22, 'slider', longLabel, {
                help_text: longLabel, slider_min_label: longLabel, slider_max_label: longLabel,
            })],
        } : s);
        await mockSurveys(page, surveys);
        await page.goto('/');
        await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
        await surveyButton(page).click();
        const dialog = page.getByRole('dialog', { name: longLabel });
        await expect(dialog).toBeVisible();
        const checkWidth = async () => {
            const geometry = await dialog.evaluate((element) => {
                const bounds = element.getBoundingClientRect();
                const escaped = [...element.querySelectorAll<HTMLElement>('input, textarea, button, [role="slider"], [data-survey-scale] p')]
                    .filter((node) => node.getClientRects().length > 0)
                    .filter((node) => {
                        const box = node.getBoundingClientRect();
                        return box.left < bounds.left - 1 || box.right > bounds.right + 1;
                    }).map((node) => node.tagName);
                return {
                    extraWidth: element.scrollWidth - element.clientWidth,
                    pageExtraWidth: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                    overflowingContainers: [...element.querySelectorAll<HTMLElement>('form, fieldset, [role="group"]')]
                        .filter((node) => node.scrollWidth > node.clientWidth + 1).length,
                    escaped,
                };
            });
            expect(geometry.extraWidth).toBeLessThanOrEqual(1);
            expect(geometry.pageExtraWidth).toBeLessThanOrEqual(1);
            expect(geometry.overflowingContainers).toBe(0);
            expect(geometry.escaped).toEqual([]);
        };
        await checkWidth();
        await nextStep(dialog);
        await expect(dialog.getByRole('alert')).toContainText('Mueve el control para elegir tu respuesta.');
        await checkWidth();
        await dialog.getByRole('slider').focus();
        await page.keyboard.press('Home');
        await expect(dialog.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');
        await checkWidth();
        await page.keyboard.press('End');
        await expect(dialog.getByRole('slider')).toHaveAttribute('aria-valuenow', '10');
        await checkWidth();
        await nextStep(dialog);
        await expect(dialog.getByRole('textbox')).not.toHaveAttribute('required', '');
        await checkWidth();
    });
}

test('mantiene la navegación visible con un título largo en una pantalla baja', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 320 });
    const title = 'EncuestaExtremadamenteLarga'.repeat(7);
    await mockSurveys(page, MOCK_SURVEYS.map((s) => s.id === 910002 ? { ...s, title } : s));
    await page.goto('/');
    await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
    await surveyButton(page).click();
    const dialog = page.getByRole('dialog', { name: title });
    await expect(dialog).toBeVisible();
    const button = (await dialog.getByRole('button', { name: 'Siguiente', exact: true }).boundingBox())!;
    expect(button.y).toBeGreaterThanOrEqual(0);
    expect(button.y + button.height).toBeLessThanOrEqual(320);
    expect(await dialog.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
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
    await expect(page.getByText('Cuéntanos qué consola te gustaría comparar en PIO.', { exact: true })).toBeVisible();
});

test('la tarjeta queda a la izquierda y el aviso de cookies a la derecha', async ({ page }) => {
    await mockSurveys(page);
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: 'Preferencias de cookies' });
    await expect(banner).toBeVisible();
    const viewport = page.viewportSize()!;
    const bannerBox = (await banner.boundingBox())!;
    const buttonBox = (await surveyButton(page).boundingBox())!;
    expect(bannerBox.x).toBeGreaterThan(viewport.width / 2);
    expect(buttonBox.x).toBeLessThan(viewport.width / 2);
    await expect.poll(async () => {
        const box = (await surveyButton(page).boundingBox())!;
        const cookies = (await banner.boundingBox())!;
        return box.x + box.width - cookies.x;
    }).toBeLessThanOrEqual(0);
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

test('/encuestas cabe a 320px y usa el formulario por pasos también para las silenciosas', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/encuestas');
    await page.getByRole('button', { name: 'Solo esenciales', exact: true }).click();
    const extraWidth = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(extraWidth).toBeLessThanOrEqual(1);
    const card = page.getByRole('article', { name: SEEDED.surveys.quiet.title });
    await card.getByRole('button', { name: 'Responder' }).click();
    const dialog = page.getByRole('dialog', { name: SEEDED.surveys.quiet.title });
    await expect(dialog.getByText('Paso 1 de 4')).toBeVisible();
    await dialog.getByLabel('PS5').check();
    await nextStep(dialog);
    await expect(dialog.getByRole('slider')).toBeVisible();
    await dialog.getByRole('slider').focus();
    await page.keyboard.press('ArrowRight');
    await nextStep(dialog);
    await nextStep(dialog); // Texto opcional.
    await expect(dialog.getByRole('textbox')).not.toHaveAttribute('required', '');
    const navigation = (await dialog.getByRole('button', { name: 'Enviar respuestas' }).boundingBox())!;
    expect(navigation.y + navigation.height).toBeLessThanOrEqual(568);
});
