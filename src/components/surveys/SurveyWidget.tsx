'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Affix, CloseButton, Group, Paper, Tooltip, Transition, UnstyledButton, Text } from '@mantine/core';
import { useClickOutside, useIdle, useMediaQuery, useReducedMotion } from '@mantine/hooks';
import { IconArrowRight } from '@tabler/icons-react';

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
/* En pantallas estrechas o bajas, el aviso de cookies ocupa el espacio de la tarjeta. */
const BANNER_OVERLAP_QUERY = '(max-width: 48em), (max-height: 42em)';
const EDGE_SLIDE = {
    in: { opacity: 1, transform: 'translateX(0)' },
    out: { opacity: 0, transform: 'translateX(calc(-100% - 32px))' },
    transitionProperty: 'transform, opacity',
};
const BOTTOM_SLIDE = {
    in: { opacity: 1, transform: 'translateY(0)' },
    out: { opacity: 0, transform: 'translateY(calc(100% + max(32px, env(safe-area-inset-bottom))))' },
    transitionProperty: 'transform, opacity',
};

/** Tarjeta lateral de la encuesta pendiente más reciente, solo en el inicio.
 *
 * Tras responderla desaparece hasta la próxima carga completa: el layout no se
 * desmonta al navegar, así que el estado en memoria dura lo que la visita, y
 * al volver a entrar aparece la siguiente pendiente, si la hay. */
export function SurveyWidget() {
    const pathname = usePathname();
    const { consent, ready } = useConsent();
    const bannerOverlaps = useMediaQuery(BANNER_OVERLAP_QUERY);
    const mobileOrTablet = useMediaQuery('(max-width: 64em)');
    const reducedMotion = useReducedMotion();
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

    const hiddenRoute = pathname !== '/';
    const bannerVisible = ready && consent === null;
    const visible = pending !== null && !answered && !hiddenRoute && !(bannerOverlaps && bannerVisible);
    const invitation = pending?.invitation_message?.trim() || 'Ayúdanos a mejorar PIO. Queremos conocer tu opinión.';

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
                <Transition
                    mounted={visible}
                    transition={mobileOrTablet ? BOTTOM_SLIDE : EDGE_SLIDE}
                    duration={reducedMotion ? 0 : 450}
                    exitDuration={reducedMotion ? 0 : 200}
                    timingFunction="cubic-bezier(0.22, 0.61, 0.36, 1)"
                >
                    {(styles) => (
                        <div ref={ref} style={styles} className="survey-widget">
                            {bubble && (
                                <Paper className="survey-widget__bubble" role="status" shadow="md" radius="md" p="sm" withBorder>
                                    <Group gap={4} wrap="nowrap" align="flex-start">
                                        <UnstyledButton onClick={open}>
                                            <Text fz="sm">{invitation}</Text>
                                        </UnstyledButton>
                                        <CloseButton size="sm" aria-label="Cerrar aviso" onClick={() => setBubble(false)} />
                                    </Group>
                                </Paper>
                            )}
                            <Tooltip
                                label={invitation}
                                multiline
                                w={280}
                                maw="calc(100vw - 32px)"
                                position="top-start"
                                withArrow
                                zIndex={195}
                                events={{ hover: true, focus: true, touch: false }}
                                styles={{ tooltip: { overflowWrap: 'anywhere' } }}
                            >
                                <UnstyledButton
                                    className="survey-widget__button"
                                    aria-label="Responder encuesta"
                                    onClick={open}
                                    onMouseEnter={() => setBubble(false)}
                                    onFocus={() => setBubble(false)}
                                >
                                    <span className="survey-widget__logo" aria-hidden="true">
                                        <Image src="/PIO-punto-negro.svg" alt="" width={40} height={48} unoptimized className="logo-mark-light" />
                                        <Image src="/PIO.svg" alt="" width={40} height={48} unoptimized className="logo-mark-dark" />
                                    </span>
                                    <span className="survey-widget__copy">
                                        <Text component="span" className="survey-widget__eyebrow">Tu opinión nos ayuda</Text>
                                        <Text component="span" className="survey-widget__action">Responder encuesta</Text>
                                    </span>
                                    <IconArrowRight size={18} aria-hidden="true" className="survey-widget__arrow" />
                                </UnstyledButton>
                            </Tooltip>
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
