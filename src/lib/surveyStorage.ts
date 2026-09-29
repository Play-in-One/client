import type { Survey } from './types';

/* Qué encuestas respondió este navegador y si ya vio el globo en esta sesión.
 *
 * Almacenamiento funcional, sin datos personales: una lista de ids y una
 * bandera de sesión (declarados en /cookies). Si el navegador lo bloquea, el
 * botón vuelve a salir y el backend rechaza la respuesta repetida. */

const ANSWERED_KEY = 'pio_surveys_answered';
const NUDGED_KEY = 'pio_survey_nudged';

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
