'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ActionIcon, Affix, CloseButton, Group, Paper, Transition, UnstyledButton, Text } from '@mantine/core';
import { useClickOutside, useIdle, useMediaQuery } from '@mantine/hooks';
import { IconMessageCircleQuestion } from '@tabler/icons-react';

import { getSurveys } from '@/lib/api';
import { useConsent } from '@/context/ConsentContext';
import {
    SURVEY_ANSWERED_EVENT,
    getAnsweredSurveyIds,
    markNudged,
    pickPendingSurvey,
    wasNudged,
} from '@/lib/surveyStorage';
import type { Survey } from '@/lib/types';
import { SurveyModal } from './SurveyModal';

const IDLE_MS = 20_000;
/* Hasta aquí el aviso de cookies ocupa casi todo el ancho y taparía el botón. */
const BANNER_OVERLAP_QUERY = '(max-width: 48em)';

/** Botón de la encuesta pendiente más reciente, abajo a la derecha.
 *
 * Tras responderla desaparece hasta la próxima carga completa: el layout no se
 * desmonta al navegar, así que el estado en memoria dura lo que la visita, y
 * al volver a entrar aparece la siguiente pendiente, si la hay. */
export function SurveyWidget() {
    const pathname = usePathname();
    const { consent, ready } = useConsent();
    const bannerOverlaps = useMediaQuery(BANNER_OVERLAP_QUERY);
    const idle = useIdle(IDLE_MS, { initialState: false });
    const [pending, setPending] = useState<Survey | null>(null);
    const [answered, setAnswered] = useState(false);
    const [opened, setOpened] = useState(false);
    const [bubble, setBubble] = useState(false);
    const ref = useClickOutside(() => setBubble(false));

    useEffect(() => {
        let cancelled = false;
        getSurveys()
            .then((surveys) => {
                if (!cancelled) setPending(pickPendingSurvey(surveys, getAnsweredSurveyIds()));
            })
            .catch(() => { /* sin encuestas no hay botón; no es un error visible */ });
        return () => {
            cancelled = true;
        };
    }, []);

    // Responderla desde /encuestas también la retira del botón.
    useEffect(() => {
        const onAnswered = (e: Event) => {
            if ((e as CustomEvent<number>).detail === pending?.id) setAnswered(true);
        };
        window.addEventListener(SURVEY_ANSWERED_EVENT, onAnswered);
        return () => window.removeEventListener(SURVEY_ANSWERED_EVENT, onAnswered);
    }, [pending]);

    const hiddenRoute = pathname.startsWith('/staff') || pathname.startsWith('/encuestas');
    const bannerVisible = ready && consent === null;
    const visible = pending !== null && !answered && !hiddenRoute && !(bannerOverlaps && bannerVisible);

    useEffect(() => {
        if (visible && idle && !opened && !wasNudged()) {
            setBubble(true);
            markNudged();
        }
    }, [visible, idle, opened]);

    const open = () => {
        setBubble(false);
        setOpened(true);
    };

    return (
        <>
            <Affix className="survey-affix" zIndex={190}>
                <Transition mounted={visible} transition="slide-up" duration={200}>
                    {(styles) => (
                        <div ref={ref} style={styles} className="survey-widget">
                            {bubble && (
                                <Paper className="survey-widget__bubble" role="status" shadow="md" radius="md" p="sm" withBorder>
                                    <Group gap={4} wrap="nowrap" align="flex-start">
                                        <UnstyledButton onClick={open}>
                                            <Text fz="sm">¿Nos ayudas con una encuesta de 1 minuto?</Text>
                                        </UnstyledButton>
                                        <CloseButton size="sm" aria-label="Cerrar aviso" onClick={() => setBubble(false)} />
                                    </Group>
                                </Paper>
                            )}
                            <ActionIcon
                                className="survey-widget__button"
                                size={52}
                                radius="xl"
                                variant="filled"
                                aria-label="Responder encuesta"
                                onClick={open}
                            >
                                <IconMessageCircleQuestion size={26} />
                            </ActionIcon>
                        </div>
                    )}
                </Transition>
            </Affix>
            {/* Fuera de la Transition: al responder, el botón se va pero el
                modal sigue abierto mostrando el agradecimiento. */}
            <SurveyModal
                survey={pending}
                opened={opened}
                onClose={() => setOpened(false)}
                onDone={() => setAnswered(true)}
            />
        </>
    );
}
