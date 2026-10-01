'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    Alert, Anchor, Badge, Button, Card, Center, Container, Group, Loader, ScrollArea,
    SimpleGrid, Stack, Table, Text, Title, UnstyledButton,
} from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';

import { DJANGO_ADMIN_URL, downloadSurveyCsv, getStaffSurveys, getSurveyResults } from '@/lib/api';
import type { StaffSurvey, SurveyMetrics, SurveyQuestionResult, SurveyResults, SurveyStatus, SurveyTextEntry } from '@/lib/types';
import { useAdmin } from '@/context/AdminContext';

const ChoiceBarChart = dynamic(() => import('./charts').then((m) => m.ChoiceBarChart), { ssr: false });
const SliderHistogram = dynamic(() => import('./charts').then((m) => m.SliderHistogram), { ssr: false });

const STATUS: Record<SurveyStatus, { label: string; color: string }> = {
    draft: { label: 'Borrador', color: 'gray' },
    open: { label: 'Abierta', color: 'green' },
    quiet: { label: 'Silenciosa', color: 'blue' },
    closed: { label: 'Cerrada', color: 'red' },
};

const DATE = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' });
const DATETIME = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' });

export function SurveysStaffClient() {
    const { isAdmin } = useAdmin();
    const [surveys, setSurveys] = useState<StaffSurvey[] | null>(null);
    const [surveysFailed, setSurveysFailed] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [results, setResults] = useState<SurveyResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        getStaffSurveys()
            .then((list) => {
                if (cancelled) return;
                setSurveys(list);
                setSelected((current) => current ?? list[0]?.id ?? null);
            })
            .catch(() => {
                if (cancelled) return;
                setSurveysFailed(true);
                setError('No se pudieron cargar las encuestas.');
            });
        return () => { cancelled = true; };
    }, [isAdmin, refresh]);

    useEffect(() => {
        if (!isAdmin || selected === null) return;
        let cancelled = false;
        setLoading(true);
        // La encuesta seleccionada cambió: los resultados anteriores no
        // corresponden a la nueva selección y no deben quedar visibles
        // mientras carga o si la carga falla.
        setResults(null);
        getSurveyResults(selected)
            .then((r) => { if (!cancelled) setResults(r); })
            .catch(() => { if (!cancelled) setError('No se pudieron cargar los resultados.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isAdmin, selected, refresh]);

    const exportCsv = async () => {
        if (selected === null) return;
        try {
            const url = URL.createObjectURL(await downloadSurveyCsv(selected));
            const link = document.createElement('a');
            link.href = url;
            link.download = `encuesta-${selected}.csv`;
            link.click();
            // Revocar de inmediato puede invalidar la descarga antes de que el
            // navegador termine de iniciarla; un pequeño margen es suficiente.
            setTimeout(() => URL.revokeObjectURL(url), 0);
        } catch {
            setError('No se pudo exportar el CSV.');
        }
    };

    if (!isAdmin) {
        return (
            <Container size="sm" py={60}>
                <Alert color="yellow" title="Necesitas iniciar sesión">
                    Este panel es solo para administradores.{' '}
                    <Anchor component={Link} href="/staff">Ir al inicio de sesión</Anchor>.
                </Alert>
            </Container>
        );
    }

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="lg">
                <Title order={1}>Encuestas</Title>
                <Group gap="xs">
                    <Button
                        component="a"
                        href={`${DJANGO_ADMIN_URL}surveys/survey/`}
                        target="_blank"
                        variant="light"
                        leftSection={<IconExternalLink size={16} />}
                    >
                        Crear o editar en el admin
                    </Button>
                    <Button component={Link} href="/staff/analytics" variant="subtle">Analítica</Button>
                </Group>
            </Group>

            {error && <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>{error}</Alert>}

            {surveys === null ? (
                surveysFailed ? null : <Center py={80}><Loader /></Center>
            ) : surveys.length === 0 ? (
                <Text c="dimmed">Aún no hay encuestas. Créalas desde el admin.</Text>
            ) : (
                <Table.ScrollContainer minWidth={620} mb="xl">
                <Table highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Encuesta</Table.Th>
                            <Table.Th>Estado</Table.Th>
                            <Table.Th>Publicada</Table.Th>
                            <Table.Th ta="right">Participaciones</Table.Th>
                            <Table.Th ta="right">Clics</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {surveys.map((s) => (
                            <Table.Tr
                                key={s.id}
                                onClick={() => setSelected(s.id)}
                                style={{ cursor: 'pointer' }}
                                bg={s.id === selected ? 'var(--mantine-color-default-hover)' : undefined}
                                aria-selected={s.id === selected}
                            >
                                <Table.Td>
                                    <UnstyledButton onClick={() => setSelected(s.id)} fz="sm" fw={s.id === selected ? 600 : 400}>
                                        {s.title}
                                    </UnstyledButton>
                                </Table.Td>
                                <Table.Td><Badge color={STATUS[s.status].color} variant="light">{STATUS[s.status].label}</Badge></Table.Td>
                                <Table.Td>{s.published_at ? DATE.format(new Date(s.published_at)) : '—'}</Table.Td>
                                <Table.Td ta="right">{s.response_count}</Table.Td>
                                <Table.Td ta="right">{s.click_count}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
                </Table.ScrollContainer>
            )}

            {loading && <Center py="xl"><Loader /></Center>}
            {!loading && results && (
                <Stack>
                    <Group justify="space-between">
                        <Title order={2} fz="h3">{results.survey.title} · {results.survey.response_count} participaciones</Title>
                        <Group gap="xs">
                            <Button variant="subtle" onClick={() => setRefresh((value) => value + 1)}>Actualizar</Button>
                            <Button leftSection={<IconDownload size={16} />} variant="light" onClick={exportCsv}>
                                Exportar CSV
                            </Button>
                        </Group>
                    </Group>
                    <Text fz="sm" c="dimmed">Incluye respuestas guardadas automáticamente aunque la encuesta no se haya enviado.</Text>
                    <ParticipationMetrics metrics={results.metrics} />
                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                        {results.questions.map((q) => <QuestionResult key={q.id} result={q} />)}
                    </SimpleGrid>
                    {results.survey.allow_comment && (
                        <Card withBorder radius="md">
                            <Text fw={600} mb="xs">Comentarios ({results.comments.length})</Text>
                            <TextList entries={results.comments} />
                        </Card>
                    )}
                </Stack>
            )}
        </Container>
    );
}

function ParticipationMetrics({ metrics: m }: { metrics: SurveyMetrics }) {
    const seconds = m.average_completion_seconds === null ? null : Math.round(m.average_completion_seconds);
    const duration = seconds === null ? '—' : seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
    return (
        <Stack gap="sm">
            <SimpleGrid cols={{ base: 2, md: 4 }}>
                {[
                    ['Clics para abrir', m.click_count],
                    ['Tiempo medio para responder', duration],
                    ['Tasa de abandono', m.abandonment_rate === null ? '—' : `${m.abandonment_rate}%`],
                    ['Encuestas enviadas', m.completed_count],
                ].map(([label, value]) => (
                    <Card key={label} withBorder radius="md">
                        <Text fz="xs" c="dimmed">{label}</Text>
                        <Text fz="xl" fw={700}>{value}</Text>
                    </Card>
                ))}
            </SimpleGrid>
            <Text fz="xs" c="dimmed">
                {m.started_count} iniciadas · {m.active_count} en curso · {m.abandoned_count} abandonadas.
                {' '}El tiempo mide los envíos completos mientras el formulario está visible. Se considera abandono cerrar sin enviar
                o pasar 30 minutos sin actividad; la tasa excluye las encuestas en curso. Estas métricas se registran desde la activación del guardado automático.
            </Text>
            <Card withBorder radius="md">
                <Text fw={600} mb="sm">¿En qué pregunta abandonan?</Text>
                <Table>
                    <Table.Thead><Table.Tr><Table.Th>Pregunta</Table.Th><Table.Th ta="right">Abandonos</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {m.abandonment_by_question.map((q) => (
                            <Table.Tr key={q.question ?? 'comment'}>
                                <Table.Td style={{ overflowWrap: 'anywhere' }}>{q.prompt}</Table.Td>
                                <Table.Td ta="right">{q.count}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Card>
        </Stack>
    );
}

function QuestionResult({ result: q }: { result: SurveyQuestionResult }) {
    return (
        <Card withBorder radius="md">
            <Text fw={600}>{q.prompt}</Text>
            <Text fz="xs" c="dimmed" mb="sm">{q.answered} respuestas</Text>
            {q.choices && <ChoiceBarChart choices={q.choices} />}
            {q.slider && (
                <>
                    <Text fz="sm" mb="xs">
                        Promedio: <b>{q.slider.average ?? '—'}</b>
                        {(q.slider.min_label || q.slider.max_label) &&
                            ` (${q.slider.min} = ${q.slider.min_label || q.slider.min}, ${q.slider.max} = ${q.slider.max_label || q.slider.max})`}
                    </Text>
                    <SliderHistogram histogram={q.slider.histogram} />
                </>
            )}
            {q.texts && <TextList entries={q.texts} />}
        </Card>
    );
}

function TextList({ entries }: { entries: SurveyTextEntry[] }) {
    if (!entries.length) return <Text fz="sm" c="dimmed">Sin respuestas de texto.</Text>;
    return (
        <ScrollArea.Autosize mah={280}>
            <Stack gap="xs">
                {entries.map((e, i) => (
                    <div key={i}>
                        <Text fz="sm">{e.text}</Text>
                        <Text fz="xs" c="dimmed">{DATETIME.format(new Date(e.created_at))}</Text>
                    </div>
                ))}
            </Stack>
        </ScrollArea.Autosize>
    );
}
