'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { ActionIcon, Alert, Box, Button, Group, Popover, Radio, Stack, Text, Tooltip } from '@mantine/core';
import {
    IconAlertTriangle, IconPhotoCheck, IconPhotoX, IconPhotoOff, IconPhoto,
    IconCurrencyDollar, IconDeviceGamepad, IconPackageOff, IconDevices,
} from '@tabler/icons-react';
import { submitIssueReport } from '@/lib/api';
import { finishReport, getReportState, REPORT_REASONS, runReport, subscribeReports } from '@/lib/reportStorage';
import type { ReportDisplayContext, ReportReason, ReportTargetType } from '@/lib/types';

const ICONS = {
    image_not_official: IconPhotoCheck, image_wrong_game: IconPhotoX,
    image_not_loading: IconPhotoOff, image_low_quality: IconPhoto,
    price_incorrect: IconCurrencyDollar, game_incorrect: IconDeviceGamepad,
    out_of_stock: IconPackageOff, console_incorrect: IconDevices,
};

interface Props {
    targetType: ReportTargetType;
    targetId: number;
    context?: ReportDisplayContext;
    cover?: boolean;
}

export default function IssueReportButton({ targetType, targetId, context = {}, cover = false }: Props) {
    const [opened, setOpened] = useState(false);
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [error, setError] = useState(false);
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const state = useSyncExternalStore(
        subscribeReports, () => getReportState(targetType, targetId), () => 'ready' as const,
    );
    const label = targetType === 'game' ? 'Reportar imagen' : 'Reportar producto';
    const blocked = state === 'blocked';

    const submit = async () => {
        if (!reason || sending) return;
        setSending(true);
        setError(false);
        try {
            await runReport(targetType, targetId, async () => {
                const response = await submitIssueReport({ target_type: targetType, target_id: targetId, reason, context });
                finishReport(targetType, targetId, response.date);
                setSent(true);
            });
        } catch {
            setError(true);
        } finally {
            setSending(false);
        }
    };

    return (
        <Box
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onKeyDownCapture={e => {
                if (e.key === 'Escape' && opened) {
                    e.stopPropagation();
                    setOpened(false);
                    buttonRef.current?.focus();
                }
            }}
            style={cover ? { position: 'absolute', right: 10, bottom: 10, zIndex: 1 } : { flexShrink: 0 }}
        >
            <Popover
                opened={opened}
                onChange={setOpened}
                width={290}
                position="bottom-end"
                withArrow
                withinPortal
                trapFocus
                zIndex={400}
                middlewares={{ shift: { padding: 12, crossAxis: true, limiter: undefined }, flip: { padding: 12 } }}
                styles={{ dropdown: {
                    maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto',
                } }}
            >
                <Popover.Target>
                    <Tooltip label={blocked ? 'Ya reportaste este elemento hoy' : label} withArrow>
                        <ActionIcon
                            ref={buttonRef}
                            aria-label={label}
                            data-report-target-type={targetType}
                            data-report-target-id={targetId}
                            variant={cover ? 'filled' : 'light'}
                            color="yellow"
                            size="lg"
                            radius="md"
                            disabled={state !== 'ready'}
                            onClick={() => {
                                setError(false);
                                setSent(false);
                                setReason(null);
                                setOpened(value => !value);
                            }}
                        >
                            <IconAlertTriangle size={19} />
                        </ActionIcon>
                    </Tooltip>
                </Popover.Target>
                <Popover.Dropdown onClick={e => e.stopPropagation()}>
                    <Stack gap="sm">
                        <Text fw={700} size="sm">{label}</Text>
                        {sent ? (
                            <Text role="status" size="sm" c="green">Reporte enviado. Gracias por avisarnos.</Text>
                        ) : blocked ? (
                            <Text size="sm">Ya reportaste este elemento hoy.</Text>
                        ) : (
                            <>
                                <Radio.Group value={reason ?? ''} onChange={value => setReason(value as ReportReason)} aria-label="Motivo del reporte">
                                    <Stack gap="xs">
                                        {REPORT_REASONS[targetType].map(option => {
                                            const Icon = ICONS[option.value];
                                            return (
                                                <Radio
                                                    key={option.value} value={option.value} disabled={sending}
                                                    label={<Group gap={8}><Icon size={17} /><Text size="sm">{option.label}</Text></Group>}
                                                />
                                            );
                                        })}
                                    </Stack>
                                </Radio.Group>
                                {error && <Alert color="red" p="xs" role="alert">No se pudo enviar el reporte. Inténtalo de nuevo.</Alert>}
                                <Button fullWidth onClick={submit} disabled={!reason || state !== 'ready'} loading={sending}>Enviar</Button>
                            </>
                        )}
                    </Stack>
                </Popover.Dropdown>
            </Popover>
        </Box>
    );
}
