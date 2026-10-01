'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Box, Button, Checkbox, Group, Progress, Radio, Slider, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconAlertCircle, IconAsterisk } from '@tabler/icons-react';

import { ApiError, submitSurveyResponse, type SurveyAnswerPayload } from '@/lib/api';
import { markSurveyAnswered, readSurveyDraft, type SurveyValue } from '@/lib/surveyStorage';
import type { Survey, SurveyQuestion } from '@/lib/types';
import styles from './Survey.module.css';
import { useSurveyAutosave } from './useSurveyAutosave';
import { SurveyCompletion } from './SurveyCompletion';

type Status = 'idle' | 'loading' | 'done' | 'error';
/** Opción única: id como string; múltiple: ids; slider: número; texto: string. */
type Value = SurveyValue;

const DEFAULT_ERROR = 'No pudimos enviar tus respuestas. Intenta nuevamente más tarde.';
const COMMENT_MAX = 1000;
const DEFAULT_DONE_SUBTITLE = 'Tu opinión nos ayuda a mejorar Play in One.';
const CLOSED_DONE_SUBTITLE = 'Gracias de todas formas.';
const REQUIRED_HELP: Record<SurveyQuestion['kind'], string> = {
    single: 'Selecciona una opción para continuar.',
    multiple: 'Selecciona al menos una opción para continuar.',
    slider: 'Mueve el control para elegir tu respuesta.',
    text: 'Escribe una respuesta para continuar.',
};

function toPayload(question: SurveyQuestion, value: Value): SurveyAnswerPayload | null {
    switch (question.kind) {
        case 'single':
            return typeof value === 'string' && value ? { question: question.id, choices: [Number(value)] } : null;
        case 'multiple':
            return Array.isArray(value) && value.length
                ? { question: question.id, choices: value.map(Number) }
                : null;
        case 'slider':
            return typeof value === 'number' ? { question: question.id, value } : null;
        case 'text': {
            const text = typeof value === 'string' ? value.trim() : '';
            return text ? { question: question.id, text } : null;
        }
    }
}

function errorMessage(err: unknown): string {
    if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const messages = Object.values(err.data as Record<string, unknown>)
            .flat()
            .filter((m): m is string => typeof m === 'string');
        if (messages.length) return messages[0];
    }
    return DEFAULT_ERROR;
}

interface SurveyFormProps {
    survey: Survey;
    onClose: () => void;
    /** Se llama al guardar la respuesta, o cuando el backend dice que ya estaba. */
    onDone?: () => void;
}

export function SurveyForm({ survey, onClose, onDone }: SurveyFormProps) {
    const [initialDraft] = useState(() => readSurveyDraft(survey));
    const [values, setValues] = useState<Record<number, Value>>(initialDraft?.values ?? {});
    const [comment, setComment] = useState(initialDraft?.comment ?? '');
    const [missing, setMissing] = useState<number[]>([]);
    const [validationVisible, setValidationVisible] = useState(false);
    const [step, setStep] = useState(initialDraft?.step ?? 0);
    const [commentError, setCommentError] = useState<string | undefined>();
    const [status, setStatus] = useState<Status>('idle');
    const [doneTitle, setDoneTitle] = useState('¡Gracias por responder!');
    const [doneSubtitle, setDoneSubtitle] = useState(DEFAULT_DONE_SUBTITLE);
    const [doneKind, setDoneKind] = useState<'submitted' | 'already' | 'closed'>('submitted');
    const [error, setError] = useState<string | null>(null);
    const stepRef = useRef<HTMLDivElement>(null);
    const validationId = useId();
    const sending = useRef(false);
    const question = survey.questions[step];
    const invalid = !!question && missing.includes(question.id);
    const isComment = step === survey.questions.length;
    const totalSteps = survey.questions.length + 1;
    const loading = status === 'loading';
    const answers = useMemo(() => survey.questions.map((q) => toPayload(q, values[q.id]))
        .filter((a): a is SurveyAnswerPayload => a !== null), [survey.questions, values]);
    const autosave = useSurveyAutosave({ survey, initialDraft, values, answers, comment, step });

    useEffect(() => {
        stepRef.current?.focus();
        if (stepRef.current) stepRef.current.scrollTop = 0;
    }, [step]);

    useEffect(() => {
        if (!question || !missing.includes(question.id)) return;
        stepRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [role="slider"]')?.focus({ preventScroll: true });
        setValidationVisible(true);
        const timer = window.setTimeout(() => setValidationVisible(false), 4000);
        return () => window.clearTimeout(timer);
    }, [missing, question]);

    const setValue = (id: number, value: Value) => {
        setValues((prev) => ({ ...prev, [id]: value }));
        setMissing((prev) => prev.filter((x) => x !== id));
        setError(null);
    };

    const advance = () => {
        if (sending.current || isComment) return;
        if (question.required && !toPayload(question, values[question.id])) {
            setMissing([question.id]);
            return;
        }
        setError(null);
        setStep((current) => current + 1);
    };

    const finish = (title: string, kind: 'submitted' | 'already' | 'closed', subtitle: string = DEFAULT_DONE_SUBTITLE) => {
        autosave.complete();
        markSurveyAnswered(survey.id);
        setDoneTitle(title);
        setDoneSubtitle(subtitle);
        setDoneKind(kind);
        setStatus('done');
        onDone?.();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sending.current) return;
        if (!isComment) {
            advance();
            return;
        }
        const answered = new Set(answers.map((a) => a.question));
        const lacking = survey.questions.filter((q) => q.required && !answered.has(q.id)).map((q) => q.id);
        if (lacking.length) {
            setMissing(lacking);
            setStep(survey.questions.findIndex((q) => q.id === lacking[0]));
            return;
        }
        sending.current = true;
        setStatus('loading');
        setError(null);
        try {
            await submitSurveyResponse(survey.id, {
                ...autosave.beginSubmission(),
                answers,
                comment: comment.trim(),
                page_path: window.location.pathname,
            });
            finish('¡Gracias por responder!', 'submitted');
        } catch (err) {
            // 409: ya la había respondido (otro dispositivo, almacenamiento
            // borrado) o se cerró mientras la llenaba. Ninguno es un error que
            // valga la pena reintentar: se marca y se cierra.
            if (err instanceof ApiError && err.status === 409) {
                const { detail, code } = (err.data as { detail?: string; code?: string } | undefined) ?? {};
                if (code === 'draft_conflict') {
                    setError(detail ?? 'Vuelve a abrir la encuesta para continuar.');
                    setStatus('error');
                    return;
                }
                if (detail?.includes('cerrada')) {
                    finish(detail, 'closed', CLOSED_DONE_SUBTITLE);
                } else {
                    finish(detail ?? 'Ya habías respondido esta encuesta', 'already');
                }
                return;
            }
            if (err instanceof ApiError && err.data && typeof err.data === 'object' && 'comment' in err.data) {
                setCommentError(errorMessage(err));
            } else {
                setError(errorMessage(err));
            }
            setStatus('error');
        } finally {
            sending.current = false;
            autosave.resumeAfterSubmission();
        }
    };

    if (status === 'done') {
        return (
            <SurveyCompletion title={doneTitle} subtitle={doneSubtitle} celebrate={doneKind === 'submitted'}
                autoClose={doneKind !== 'closed'} onClose={onClose} />
        );
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={loading}>
            <Stack className={styles.progress} gap="xs">
                <Group justify="space-between" gap="xs">
                    <Text fz="sm" fw={600} role="status" aria-live="polite" aria-atomic="true">
                        Paso {step + 1} de {totalSteps}
                    </Text>
                    <Text fz="xs" c="dimmed">{isComment ? 'Comentario final' : 'Tu opinión'}</Text>
                </Group>
                <Progress value={(step + 1) / totalSteps * 100} size={4} radius="xl" aria-label="Progreso de la encuesta" />
            </Stack>
            <div ref={stepRef} className={styles.step} tabIndex={-1} role="group"
                aria-label={isComment ? 'Comentario final' : `Pregunta ${step + 1}`} data-autofocus>
                {step === 0 && survey.description && <Text c="dimmed" fz="sm" mb="lg">{survey.description}</Text>}
                {question && (
                    <Group className={styles.requirement} gap="xs" mb="md">
                        <Badge size="sm" radius="sm" variant="light"
                            color={question.required ? (missing.includes(question.id) ? 'red' : 'pink') : 'gray'}
                            leftSection={question.required ? <IconAsterisk size={11} aria-hidden="true" /> : undefined}>
                            {question.required ? 'Obligatoria' : 'Opcional'}
                        </Badge>
                        <Text fz="xs" c="dimmed">
                            {question.required ? 'Necesaria para continuar.' : 'Puedes pasar a la siguiente pregunta.'}
                        </Text>
                    </Group>
                )}
                <fieldset className={styles.fieldset} disabled={loading} data-invalid={invalid || undefined}>
                    {question ? (
                        <QuestionField
                            key={question.id}
                            question={question}
                            value={values[question.id]}
                            invalid={invalid}
                            errorId={validationId}
                            onChange={(v) => setValue(question.id, v)}
                        />
                    ) : (
                        <Stack gap="xs">
                            <Textarea
                                label={survey.comment_prompt.trim() || '¿Algo más que quieras contarnos?'}
                                description="Opcional. Cuéntanos qué mejorarías."
                                error={commentError}
                                autosize
                                minRows={4}
                                maxRows={6}
                                maxLength={COMMENT_MAX}
                                value={comment}
                                onChange={(e) => {
                                    setComment(e.currentTarget.value);
                                    setCommentError(undefined);
                                    setError(null);
                                }}
                            />
                            <Text fz="xs" c="dimmed" ta="right">{comment.length}/{COMMENT_MAX}</Text>
                        </Stack>
                    )}
                </fieldset>
                {error && <Alert color="red" variant="light" mt="md" role="alert">{error}</Alert>}
            </div>
            <div className={styles.navigation}>
                {question && invalid && (
                    <div id={validationId} className={styles.validationToast} role="alert" hidden={!validationVisible}>
                        <IconAlertCircle size={18} aria-hidden="true" />
                        <Text fz="xs">{REQUIRED_HELP[question.kind]}</Text>
                    </div>
                )}
                <Button type="button" variant="default" disabled={step === 0 || loading}
                    onClick={() => {
                        if (sending.current) return;
                        setError(null);
                        setStep((current) => current - 1);
                    }}>
                    Anterior
                </Button>
                <Button type="submit" loading={loading}>
                    {isComment ? 'Enviar respuestas' : 'Siguiente'}
                </Button>
                <Text className={styles.saveStatus} fz="xs" c={autosave.saveStatus === 'error' ? 'red' : 'dimmed'} role="status">
                    {autosave.saveStatus === 'saving' ? 'Guardando automáticamente…'
                        : autosave.saveStatus === 'saved' ? 'Guardado automáticamente'
                            : autosave.saveStatus === 'conflict' ? 'Esta encuesta está abierta en otra pestaña. Vuelve a abrirla aquí para continuar.'
                                : 'No se pudo guardar. Se reintentará automáticamente.'}
                </Text>
            </div>
        </form>
    );
}

interface FieldProps {
    question: SurveyQuestion;
    value: Value;
    invalid: boolean;
    errorId: string;
    onChange: (value: Value) => void;
}

function QuestionField({ question: q, value, invalid, errorId, onChange }: FieldProps) {
    const fieldId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const description = q.help_text || undefined;
    // Mantine genera aria-describedby y reemplaza el atributo pasado como prop.
    // Vinculamos el aviso externo sobre el input real, conservando su ayuda.
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        const describedBy = [invalid ? errorId : '', description ? `${fieldId}-description` : ''].filter(Boolean).join(' ');
        if (describedBy) input.setAttribute('aria-describedby', describedBy);
        else input.removeAttribute('aria-describedby');
    }, [invalid, errorId, description, fieldId]);

    switch (q.kind) {
        case 'single':
            return (
                <Radio.Group
                    label={q.prompt}
                    description={description}
                    withAsterisk={q.required}
                    error={invalid}
                    value={typeof value === 'string' ? value : null}
                    onChange={onChange}
                >
                    <Stack gap="xs" mt="xs">
                        {q.choices.map((c) => (
                            <Radio
                                classNames={{ body: styles.choice }}
                                wrapperProps={{ bodyElement: 'label', labelElement: 'span' }}
                                key={c.id} value={String(c.id)} label={c.label}
                                aria-invalid={invalid || undefined}
                                aria-describedby={invalid ? errorId : undefined}
                            />
                        ))}
                    </Stack>
                </Radio.Group>
            );
        case 'multiple':
            return (
                <Checkbox.Group
                    label={q.prompt}
                    description={description ?? 'Puedes elegir varias'}
                    withAsterisk={q.required}
                    error={invalid}
                    value={Array.isArray(value) ? value : []}
                    onChange={onChange}
                >
                    <Stack gap="xs" mt="xs">
                        {q.choices.map((c) => (
                            <Checkbox
                                classNames={{ body: styles.choice }}
                                wrapperProps={{ bodyElement: 'label', labelElement: 'span' }}
                                key={c.id} value={String(c.id)} label={c.label}
                                aria-invalid={invalid || undefined}
                                aria-describedby={invalid ? errorId : undefined}
                            />
                        ))}
                    </Stack>
                </Checkbox.Group>
            );
        case 'slider':
            return <SliderField question={q} value={typeof value === 'number' ? value : undefined}
                invalid={invalid} errorId={errorId} onChange={onChange} />;
        case 'text': {
            const text = typeof value === 'string' ? value : '';
            return (
                <Stack gap="xs">
                    <TextInput
                        ref={inputRef}
                        id={fieldId}
                        label={q.prompt}
                        description={description}
                        descriptionProps={{ id: `${fieldId}-description` }}
                        withAsterisk={q.required}
                        error={invalid}
                        maxLength={q.text_max_length}
                        value={text}
                        onChange={(e) => onChange(e.currentTarget.value)}
                    />
                    <Text fz="xs" c="dimmed" ta="right">{text.length}/{q.text_max_length}</Text>
                </Stack>
            );
        }
    }
}

function SliderField({ question: q, value, invalid, errorId, onChange }: {
    question: SurveyQuestion;
    value: number | undefined;
    invalid: boolean;
    errorId: string;
    onChange: (value: number) => void;
}) {
    // Sin tocar no cuenta como respuesta: el control arranca al medio y en gris
    // para no sesgar los resultados hacia donde estaba el pulgar.
    const middle = q.slider_min + Math.round((q.slider_max - q.slider_min) / q.slider_step / 2) * q.slider_step;
    const touched = value !== undefined;
    const hintId = useId();
    // El thumb (role="slider") es el elemento enfocable, pero Mantine no expone
    // `aria-describedby`/`aria-invalid` como prop (su `thumbProps` no reenvía
    // atributos que Thumb no conoce explícitamente): se los seteamos a mano
    // sobre el nodo real vía ref, así el lector de pantalla sí anuncia el hint
    // y el estado inválido al enfocar el control.
    const sliderRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const thumb = sliderRef.current?.querySelector('[role="slider"]');
        if (!thumb) return;
        thumb.setAttribute('aria-describedby', invalid ? `${errorId} ${hintId}` : hintId);
        if (invalid) {
            thumb.setAttribute('aria-invalid', 'true');
        } else {
            thumb.removeAttribute('aria-invalid');
        }
    }, [hintId, invalid, errorId]);
    return (
        <Stack gap="sm">
            <Text fw={500} fz="sm">
                {q.prompt}
                {q.required && <Text span c="red"> *</Text>}
            </Text>
            {q.help_text && <Text fz="xs" c="dimmed">{q.help_text}</Text>}
            <Box className={styles.sliderControl}>
                <Slider
                    ref={sliderRef}
                    min={q.slider_min}
                    max={q.slider_max}
                    step={q.slider_step}
                    value={value ?? middle}
                    onChange={onChange}
                    color={invalid ? 'red' : touched ? undefined : 'gray'}
                    thumbLabel={q.prompt}
                    label={null}
                    size="md"
                    thumbSize={22}
                    marks={[
                        { value: q.slider_min },
                        { value: q.slider_max },
                    ]}
                />
            </Box>
            <div className={styles.scale} data-survey-scale>
                <Text className={styles.scaleLabel} fz="xs" c="dimmed">
                    {q.slider_min_label ? `${q.slider_min} · ${q.slider_min_label}` : q.slider_min}
                </Text>
                <Text className={styles.scaleLabel} fz="xs" c="dimmed" ta="right">
                    {q.slider_max_label ? `${q.slider_max} · ${q.slider_max_label}` : q.slider_max}
                </Text>
            </div>
            <Text id={hintId} fz="xs" c="dimmed">
                {touched ? `Tu respuesta: ${value}` : 'Mueve el control para responder.'}
            </Text>
        </Stack>
    );
}
