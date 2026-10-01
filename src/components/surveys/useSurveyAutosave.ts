'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, saveSurveyDraft, type SurveyAnswerPayload, type SurveyDraftPayload } from '@/lib/api';
import { clearSurveyDraft, storeSurveyDraft, type SurveyDraft, type SurveyValue } from '@/lib/surveyStorage';
import type { Survey } from '@/lib/types';

interface Options {
    survey: Survey;
    initialDraft: SurveyDraft | null;
    values: Record<number, SurveyValue>;
    answers: SurveyAnswerPayload[];
    comment: string;
    step: number;
}

type SaveStatus = 'saving' | 'saved' | 'error' | 'conflict';

export function useSurveyAutosave(options: Options) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saving');
    const [draft] = useState<SurveyDraft>(() => options.initialDraft ?? {
        token: crypto.randomUUID(), values: {}, comment: '', step: 0, revision: 0, durationMs: 0,
    });
    const [openEvent] = useState(() => crypto.randomUUID());
    const draftRef = useRef(draft);
    const latest = useRef(options);
    const mounted = useRef(false);
    const finished = useRef(false);
    const submitting = useRef(false);
    const blocked = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const durationBase = useRef(draft.durationMs);
    const activeSince = useRef<number | null>(null);
    const lastInteraction = useRef<number | null>(null);
    latest.current = options;

    const elapsed = useCallback(() => Math.min(604800000, Math.round(durationBase.current
        + (activeSince.current === null ? 0 : performance.now() - activeSince.current))), []);

    const stopClock = useCallback(() => {
        durationBase.current = elapsed();
        activeSince.current = null;
    }, [elapsed]);

    const snapshot = useCallback((paused: boolean): SurveyDraftPayload => {
        const { survey, values, comment, step, answers } = latest.current;
        const local = { ...draftRef.current, values, comment, step, writer: openEvent,
            revision: draftRef.current.revision + 1, durationMs: elapsed() };
        draftRef.current = local;
        storeSurveyDraft(survey.id, local);
        return { answers, comment: comment.trim(), page_path: window.location.pathname,
            draft_token: local.token, open_event_id: openEvent, revision: local.revision,
            current_question: survey.questions[step]?.id ?? null, duration_ms: local.durationMs, paused,
            inactive_ms: Math.min(604800000, Math.round(performance.now() - (lastInteraction.current ?? performance.now()))) };
    }, [elapsed, openEvent]);

    const send = useCallback(async (payload: SurveyDraftPayload) => {
        if (finished.current || blocked.current) return;
        try {
            const result = await saveSurveyDraft(latest.current.survey.id, payload);
            if (finished.current) return;
            // Una revisión mayor contiene respuestas que esta pestaña desconoce.
            // No elevar nuestra revisión para sobrescribir ese contenido.
            if ((result.revision ?? 0) > draftRef.current.revision) {
                blocked.current = true;
                if (mounted.current) setSaveStatus('conflict');
                return;
            }
            if (mounted.current && !payload.paused && payload.revision >= draftRef.current.revision) setSaveStatus('saved');
        } catch (error) {
            if (finished.current) return;
            if (error instanceof ApiError && error.status === 409) {
                blocked.current = true;
                if (mounted.current && (error.data as { code?: string })?.code === 'draft_conflict') {
                    setSaveStatus('conflict');
                    return;
                }
            }
            if (mounted.current && !payload.paused && payload.revision >= draftRef.current.revision) setSaveStatus('error');
        }
    }, []);

    const flush = useCallback((paused = false) => {
        if (timer.current) clearTimeout(timer.current);
        if (finished.current || (submitting.current && !paused) || blocked.current) return;
        const payload = snapshot(paused);
        if (mounted.current && !paused) setSaveStatus('saving');
        void send(payload);
    }, [send, snapshot]);

    useEffect(() => {
        mounted.current = true;
        lastInteraction.current = performance.now();
        storeSurveyDraft(latest.current.survey.id, { ...draftRef.current, writer: openEvent }, true);
        if (document.visibilityState === 'visible') activeSince.current = performance.now();
        flush();
        const visibility = () => {
            if (document.visibilityState === 'hidden') {
                stopClock();
                flush();
            } else if (!submitting.current && !finished.current) {
                activeSince.current = performance.now();
                flush();
            }
        };
        const pageHide = () => { stopClock(); flush(true); };
        document.addEventListener('visibilitychange', visibility);
        window.addEventListener('pagehide', pageHide);
        // Conserva actividad y reintenta errores de conexión sin requerir un cambio de campo.
        const heartbeat = setInterval(() => {
            if (document.visibilityState === 'visible') flush();
        }, 15_000);
        return () => {
            mounted.current = false;
            document.removeEventListener('visibilitychange', visibility);
            window.removeEventListener('pagehide', pageHide);
            clearInterval(heartbeat);
            stopClock();
            flush(true);
        };
    }, [flush, stopClock, openEvent]);

    useEffect(() => {
        if (finished.current || submitting.current || blocked.current) return;
        lastInteraction.current = performance.now();
        const payload = snapshot(false);
        setSaveStatus('saving');
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { void send(payload); }, 500);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [options.values, options.comment, options.step, send, snapshot]);

    const beginSubmission = () => {
        submitting.current = true;
        if (timer.current) clearTimeout(timer.current);
        stopClock();
        const payload = snapshot(false);
        return { draft_token: payload.draft_token, open_event_id: payload.open_event_id, duration_ms: payload.duration_ms };
    };

    const complete = () => {
        finished.current = true;
        if (timer.current) clearTimeout(timer.current);
        clearSurveyDraft(latest.current.survey.id);
    };

    const resumeAfterSubmission = () => {
        submitting.current = false;
        if (!finished.current && document.visibilityState === 'visible') activeSince.current = performance.now();
    };

    return { saveStatus, beginSubmission, complete, resumeAfterSubmission };
}
