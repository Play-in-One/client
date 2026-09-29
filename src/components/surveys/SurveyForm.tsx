'use client';

import { useState } from 'react';
import { Alert, Button, Checkbox, Radio, Slider, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';

import { ApiError, submitSurveyResponse, type SurveyAnswerPayload } from '@/lib/api';
import { markSurveyAnswered } from '@/lib/surveyStorage';
import type { Survey, SurveyQuestion } from '@/lib/types';

type Status = 'idle' | 'loading' | 'done' | 'error';
/** Opción única: id como string; múltiple: ids; slider: número; texto: string. */
type Value = string | string[] | number | undefined;

const DEFAULT_ERROR = 'No pudimos enviar tus respuestas. Intenta nuevamente más tarde.';
const REQUIRED_ERROR = 'Esta pregunta es obligatoria.';
const COMMENT_MAX = 1000;

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
    /** Se llama al guardar la respuesta, o cuando el backend dice que ya estaba. */
    onDone?: () => void;
}

export function SurveyForm({ survey, onDone }: SurveyFormProps) {
    const [values, setValues] = useState<Record<number, Value>>({});
    const [comment, setComment] = useState('');
    const [missing, setMissing] = useState<number[]>([]);
    const [status, setStatus] = useState<Status>('idle');
    const [doneTitle, setDoneTitle] = useState('¡Gracias por responder!');
    const [error, setError] = useState<string | null>(null);

    const setValue = (id: number, value: Value) => {
        setValues((prev) => ({ ...prev, [id]: value }));
        setMissing((prev) => prev.filter((x) => x !== id));
    };

    const finish = (title: string) => {
        markSurveyAnswered(survey.id);
        setDoneTitle(title);
        setStatus('done');
        onDone?.();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const answers = survey.questions
            .map((q) => toPayload(q, values[q.id]))
            .filter((a): a is SurveyAnswerPayload => a !== null);
        const answered = new Set(answers.map((a) => a.question));
        const lacking = survey.questions.filter((q) => q.required && !answered.has(q.id)).map((q) => q.id);
        if (lacking.length) {
            setMissing(lacking);
            setError('Responde las preguntas marcadas antes de enviar.');
            return;
        }

        setStatus('loading');
        setError(null);
        try {
            await submitSurveyResponse(survey.id, {
                answers,
                comment: survey.allow_comment ? comment.trim() : '',
                page_path: window.location.pathname,
            });
            finish('¡Gracias por responder!');
        } catch (err) {
            // 409: ya la había respondido (otro dispositivo, almacenamiento
            // borrado) o se cerró mientras la llenaba. Ninguno es un error que
            // valga la pena reintentar: se marca y se cierra.
            if (err instanceof ApiError && err.status === 409) {
                const detail = (err.data as { detail?: string } | undefined)?.detail;
                finish(detail ?? 'Ya habías respondido esta encuesta');
                return;
            }
            setError(errorMessage(err));
            setStatus('error');
        }
    };

    if (status === 'done') {
        return (
            <Stack align="center" gap="xs" py="lg">
                <IconCircleCheck size={48} color="var(--mantine-color-green-6)" />
                <Title order={3} ta="center">{doneTitle}</Title>
                <Text c="dimmed" fz="sm" ta="center">Tu opinión nos ayuda a mejorar Play in One.</Text>
            </Stack>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <Stack gap="lg">
                {survey.questions.map((q) => (
                    <QuestionField
                        key={q.id}
                        question={q}
                        value={values[q.id]}
                        invalid={missing.includes(q.id)}
                        onChange={(v) => setValue(q.id, v)}
                    />
                ))}
                {survey.allow_comment && (
                    <Textarea
                        label={survey.comment_prompt}
                        description="Opcional"
                        autosize
                        minRows={2}
                        maxRows={6}
                        maxLength={COMMENT_MAX}
                        value={comment}
                        onChange={(e) => setComment(e.currentTarget.value)}
                    />
                )}
                {error && <Alert color="red" variant="light">{error}</Alert>}
                <Button type="submit" loading={status === 'loading'} fullWidth size="md">
                    Enviar respuestas
                </Button>
            </Stack>
        </form>
    );
}

interface FieldProps {
    question: SurveyQuestion;
    value: Value;
    invalid: boolean;
    onChange: (value: Value) => void;
}

function QuestionField({ question: q, value, invalid, onChange }: FieldProps) {
    const error = invalid ? REQUIRED_ERROR : undefined;
    const description = q.help_text || undefined;

    switch (q.kind) {
        case 'single':
            return (
                <Radio.Group
                    label={q.prompt}
                    description={description}
                    withAsterisk={q.required}
                    error={error}
                    value={typeof value === 'string' ? value : null}
                    onChange={onChange}
                >
                    <Stack gap="xs" mt="xs">
                        {q.choices.map((c) => (
                            <Radio key={c.id} value={String(c.id)} label={c.label} />
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
                    error={error}
                    value={Array.isArray(value) ? value : []}
                    onChange={onChange}
                >
                    <Stack gap="xs" mt="xs">
                        {q.choices.map((c) => (
                            <Checkbox key={c.id} value={String(c.id)} label={c.label} />
                        ))}
                    </Stack>
                </Checkbox.Group>
            );
        case 'slider':
            return <SliderField question={q} value={typeof value === 'number' ? value : undefined} error={error} onChange={onChange} />;
        case 'text': {
            const text = typeof value === 'string' ? value : '';
            return (
                <TextInput
                    label={q.prompt}
                    description={description}
                    withAsterisk={q.required}
                    error={error}
                    maxLength={q.text_max_length}
                    value={text}
                    onChange={(e) => onChange(e.currentTarget.value)}
                    rightSection={<Text fz="xs" c="dimmed">{text.length}/{q.text_max_length}</Text>}
                    rightSectionWidth={72}
                />
            );
        }
    }
}

function SliderField({ question: q, value, error, onChange }: {
    question: SurveyQuestion;
    value: number | undefined;
    error?: string;
    onChange: (value: number) => void;
}) {
    // Sin tocar no cuenta como respuesta: el control arranca al medio y en gris
    // para no sesgar los resultados hacia donde estaba el pulgar.
    const middle = q.slider_min + Math.round((q.slider_max - q.slider_min) / q.slider_step / 2) * q.slider_step;
    const touched = value !== undefined;
    return (
        <Stack gap={6}>
            <Text fw={500} fz="sm">
                {q.prompt}
                {q.required && <Text span c="red"> *</Text>}
            </Text>
            {q.help_text && <Text fz="xs" c="dimmed">{q.help_text}</Text>}
            <Slider
                min={q.slider_min}
                max={q.slider_max}
                step={q.slider_step}
                value={value ?? middle}
                onChange={onChange}
                color={touched ? undefined : 'gray'}
                aria-label={q.prompt}
                marks={[
                    { value: q.slider_min, label: q.slider_min_label || String(q.slider_min) },
                    { value: q.slider_max, label: q.slider_max_label || String(q.slider_max) },
                ]}
                mb="lg"
            />
            <Text fz="xs" c={error ? 'red' : 'dimmed'}>
                {touched ? `Tu respuesta: ${value}` : (error ?? 'Mueve el control para responder.')}
            </Text>
        </Stack>
    );
}
