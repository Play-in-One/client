'use client';

import { useEffect, useState } from 'react';
import { Badge, Box, Button, Container, Stack, Text, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

import { SurveyModal } from '@/components/surveys/SurveyModal';
import styles from '@/components/surveys/Survey.module.css';
import { SURVEY_ANSWERED_EVENT, getAnsweredSurveyIds } from '@/lib/surveyStorage';
import type { Survey } from '@/lib/types';

const DATE_FORMAT = new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago', // igual en servidor y navegador: sin desajuste de hidratación
});

export function EncuestasClient({ surveys }: { surveys: Survey[] }) {
    const [answered, setAnswered] = useState<number[]>([]);
    const [active, setActive] = useState<Survey | null>(null);

    useEffect(() => {
        const sync = () => setAnswered(getAnsweredSurveyIds());
        sync();
        window.addEventListener(SURVEY_ANSWERED_EVENT, sync);
        return () => window.removeEventListener(SURVEY_ANSWERED_EVENT, sync);
    }, []);

    const done = new Set(answered);
    const pending = surveys.filter((s) => !done.has(s.id));
    const completed = surveys.filter((s) => done.has(s.id));

    return (
        <Container size="sm" py={60}>
            <Title order={1} ta="center" mb="xs">Encuestas</Title>
            <Text c="dimmed" ta="center" mb="xl">
                Preguntas cortas para saber qué mejorar. Toman un minuto y no te pedimos ningún dato personal.
            </Text>

            {surveys.length === 0 ? (
                <Text ta="center" c="dimmed">No hay encuestas abiertas por ahora. ¡Vuelve pronto!</Text>
            ) : (
                <Stack>
                    {pending.map((s) => (
                        <SurveyCard key={s.id} survey={s} onAnswer={() => setActive(s)} />
                    ))}
                    {completed.map((s) => (
                        <SurveyCard key={s.id} survey={s} />
                    ))}
                </Stack>
            )}

            <SurveyModal survey={active} opened={active !== null} onClose={() => setActive(null)} />
        </Container>
    );
}

function SurveyCard({ survey, onAnswer }: { survey: Survey; onAnswer?: () => void }) {
    const count = survey.questions.length;
    return (
        <Box className={`content-card ${styles.card}`} p="lg" component="article" aria-label={survey.title}>
            <div className={styles.cardContent}>
                <Stack className={styles.cardText} gap={4}>
                    <Title order={2} fz="lg">{survey.title}</Title>
                    {survey.description && <Text fz="sm" c="dimmed">{survey.description}</Text>}
                    <Text fz="xs" c="dimmed">
                        {count} {count === 1 ? 'pregunta' : 'preguntas'} · {DATE_FORMAT.format(new Date(survey.published_at))}
                    </Text>
                </Stack>
                {onAnswer ? (
                    <Button onClick={onAnswer} style={{ flexShrink: 0 }}>Responder</Button>
                ) : (
                    <Badge color="green" variant="light" leftSection={<IconCheck size={12} />} style={{ flexShrink: 0 }}>
                        Respondida
                    </Badge>
                )}
            </div>
        </Box>
    );
}
