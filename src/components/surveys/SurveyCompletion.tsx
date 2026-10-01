'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Progress, Stack, Text, Title } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconCircleCheck } from '@tabler/icons-react';
import styles from './Survey.module.css';

const CLOSE_AFTER_MS = 5000;
const COLORS = ['var(--mantine-primary-color-filled)', '#ffca57', '#4ecdc4', '#8f80ff', '#ff8c69'];

interface SurveyCompletionProps {
    title: string;
    subtitle: string;
    celebrate: boolean;
    autoClose: boolean;
    onClose: () => void;
}

export function SurveyCompletion({ title, subtitle, celebrate, autoClose, onClose }: SurveyCompletionProps) {
    const reducedMotion = useReducedMotion();
    const [remaining, setRemaining] = useState(CLOSE_AFTER_MS);
    const closeRef = useRef(onClose);
    const titleRef = useRef<HTMLHeadingElement>(null);
    closeRef.current = onClose;

    useEffect(() => { titleRef.current?.focus(); }, []);

    useEffect(() => {
        if (!autoClose) return;
        const deadline = performance.now() + CLOSE_AFTER_MS;
        const interval = window.setInterval(() => {
            setRemaining(Math.max(0, deadline - performance.now()));
        }, 100);
        const timeout = window.setTimeout(() => {
            window.clearInterval(interval);
            setRemaining(0);
            closeRef.current();
        }, CLOSE_AFTER_MS);
        return () => {
            window.clearInterval(interval);
            window.clearTimeout(timeout);
        };
    }, [autoClose]);

    return (
        <Stack className={styles.done} align="center" justify="center" gap="lg" p="xl">
            {celebrate && !reducedMotion && (
                <div className={styles.confetti} aria-hidden="true" data-survey-confetti>
                    {Array.from({ length: 48 }, (_, i) => (
                        <span key={i} className={styles.confettiParticle} style={{
                            left: `${1 + (i * 17) % 97}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                            borderRadius: i % 4 === 0 ? '50%' : '2px',
                            animationDelay: `${(i % 12) * 35}ms`,
                            animationDuration: `${2200 + (i % 5) * 180}ms`,
                            '--confetti-drift': `${(i % 9 - 4) * 13}px`,
                            '--confetti-spin': `${i % 2 ? 540 : -540}deg`,
                        } as CSSProperties} />
                    ))}
                </div>
            )}
            <Stack align="center" gap="xs" role="status" className={styles.completionMessage}>
                <IconCircleCheck size={48} color="var(--mantine-color-green-6)" />
                <Title ref={titleRef} tabIndex={-1} order={3} ta="center">{title}</Title>
                <Text c="dimmed" fz="sm" ta="center">{subtitle}</Text>
            </Stack>
            {autoClose && (
                <Stack gap="xs" className={styles.countdown}>
                    <Text c="dimmed" fz="xs" ta="center">Este aviso se cerrará en {Math.ceil(remaining / 1000)} s.</Text>
                    <Progress value={Math.round(remaining / CLOSE_AFTER_MS * 100)} size={5} radius="xl"
                        transitionDuration={reducedMotion ? 0 : 100} aria-label="Tiempo restante antes de cerrar" />
                </Stack>
            )}
        </Stack>
    );
}
