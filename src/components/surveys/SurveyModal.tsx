'use client';

import { Group, Modal, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconMessageCircleQuestion } from '@tabler/icons-react';

import type { Survey } from '@/lib/types';
import { SurveyForm } from './SurveyForm';

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
            fullScreen={isMobile}
            title={
                <Group gap="xs" wrap="nowrap">
                    <IconMessageCircleQuestion size={20} />
                    <Text fw={700}>{survey?.title}</Text>
                </Group>
            }
        >
            {survey && (
                <>
                    {survey.description && <Text c="dimmed" fz="sm" mb="md">{survey.description}</Text>}
                    {/* key: cambiar de encuesta reinicia el formulario */}
                    <SurveyForm key={survey.id} survey={survey} onDone={onDone} />
                </>
            )}
        </Modal>
    );
}
