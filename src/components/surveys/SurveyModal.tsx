'use client';

import { Group, Modal, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconMessageCircleQuestion } from '@tabler/icons-react';

import type { Survey } from '@/lib/types';
import { SurveyForm } from './SurveyForm';
import styles from './Survey.module.css';

interface SurveyModalProps {
    survey: Survey | null;
    opened: boolean;
    onClose: () => void;
    onDone?: () => void;
}

export function SurveyModal({ survey, opened, onClose, onDone }: SurveyModalProps) {
    const isMobile = useMediaQuery('(max-width: 36em)');
    return (
        <Modal
            opened={opened && survey !== null}
            onClose={onClose}
            centered
            radius="lg"
            size="lg"
            zIndex={310}
            fullScreen={isMobile}
            classNames={{ content: styles.modalContent, header: styles.modalHeader, title: styles.modalTitle, body: styles.modalBody }}
            title={
                <Group gap="xs" wrap="nowrap">
                    <IconMessageCircleQuestion size={20} style={{ flexShrink: 0 }} />
                    <Text fw={700} style={{ minWidth: 0 }}>{survey?.title}</Text>
                </Group>
            }
        >
            {survey && (
                <>
                    {/* key: cambiar de encuesta reinicia el formulario */}
                    <SurveyForm key={survey.id} survey={survey} onDone={onDone} onClose={onClose} />
                </>
            )}
        </Modal>
    );
}
