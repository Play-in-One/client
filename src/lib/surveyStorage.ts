import type { Survey } from './types';

/* Almacenamiento funcional declarado en /cookies: respuestas y comentario
 * en curso, identificador del borrador, progreso y tiempo activo, ids de
 * encuestas enviadas y una bandera de sesión para no repetir el aviso.
 * Si el navegador lo bloquea, el servidor sigue guardando los cambios. */

const ANSWERED_KEY = 'pio_surveys_answered';
const NUDGED_KEY = 'pio_survey_nudged';
const DRAFT_KEY = 'pio_survey_draft_';

export type SurveyValue = string | string[] | number | undefined;

export interface SurveyDraft {
    token: string;
    values: Record<number, SurveyValue>;
    comment: string;
    step: number;
    revision: number;
    durationMs: number;
    writer?: string;
}

export function readSurveyDraft(survey: Survey): SurveyDraft | null {
    try {
        const raw = window.localStorage.getItem(`${DRAFT_KEY}${survey.id}`);
        if (!raw) return null;
        const draft = JSON.parse(raw) as Partial<SurveyDraft>;
        if (typeof draft.token !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(draft.token)) return null;
        const values: Record<number, SurveyValue> = {};
        for (const q of survey.questions) {
            const value = draft.values?.[q.id];
            if (q.kind === 'single' && typeof value === 'string' && q.choices.some((c) => String(c.id) === value)) values[q.id] = value;
            if (q.kind === 'multiple' && Array.isArray(value)) values[q.id] = [...new Set(value.filter((v) => q.choices.some((c) => String(c.id) === v)))];
            if (q.kind === 'text' && typeof value === 'string') values[q.id] = value.slice(0, q.text_max_length);
            if (q.kind === 'slider' && typeof value === 'number' && Number.isFinite(value)
                && value >= q.slider_min && value <= q.slider_max && (value - q.slider_min) % q.slider_step === 0) values[q.id] = value;
        }
        const safeNumber = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
        return {
            token: draft.token, values,
            comment: typeof draft.comment === 'string' ? draft.comment.slice(0, 1000) : '',
            step: Math.min(safeNumber(draft.step), survey.questions.length),
            revision: safeNumber(draft.revision), durationMs: Math.min(safeNumber(draft.durationMs), 604800000),
        };
    } catch {
        return null;
    }
}

export function storeSurveyDraft(surveyId: number, draft: SurveyDraft, claim = false): void {
    try {
        const key = `${DRAFT_KEY}${surveyId}`;
        const stored = window.localStorage.getItem(key);
        const previous = stored ? JSON.parse(stored) as Partial<SurveyDraft> : null;
        // Una pestaña anterior tampoco puede degradar el borrador local.
        if (!claim && previous?.token === draft.token && (
            (previous.writer && previous.writer !== draft.writer)
            || (typeof previous.revision === 'number' && previous.revision > draft.revision)
        )) return;
        window.localStorage.setItem(key, JSON.stringify(draft));
    } catch { /* El servidor sigue guardando. */ }
}

export function clearSurveyDraft(surveyId: number): void {
    try { window.localStorage.removeItem(`${DRAFT_KEY}${surveyId}`); } catch { /* ignore */ }
}

/** Se emite en `window` al responder, con el id en `detail`. */
export const SURVEY_ANSWERED_EVENT = 'pio:survey-answered';

export function getAnsweredSurveyIds(): number[] {
    try {
        const raw = window.localStorage.getItem(ANSWERED_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
    } catch {
        return [];
    }
}

export function markSurveyAnswered(id: number): void {
    try {
        const ids = new Set(getAnsweredSurveyIds());
        ids.add(id);
        window.localStorage.setItem(ANSWERED_KEY, JSON.stringify([...ids]));
    } catch {
        /* almacenamiento bloqueado: se sigue igual, el backend deduplica */
    }
    window.dispatchEvent(new CustomEvent<number>(SURVEY_ANSWERED_EVENT, { detail: id }));
}

export function wasNudged(): boolean {
    try {
        return window.sessionStorage.getItem(NUDGED_KEY) === '1';
    } catch {
        return true; // sin almacenamiento, mejor no insistir
    }
}

export function markNudged(): void {
    try {
        window.sessionStorage.setItem(NUDGED_KEY, '1');
    } catch {
        /* ignore */
    }
}

/** La encuesta abierta, no silenciosa y sin responder más reciente. */
export function pickPendingSurvey(surveys: Survey[], answered: number[]): Survey | null {
    const done = new Set(answered);
    return (
        surveys
            .filter((s) => !s.is_quiet && !done.has(s.id))
            .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0] ?? null
    );
}
