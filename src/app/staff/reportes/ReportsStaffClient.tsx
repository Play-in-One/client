'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useDebouncedValue } from '@mantine/hooks';
import {
    Alert, Anchor, Badge, Button, Checkbox, Container, Group, Loader, Pagination,
    ScrollArea, Select, SimpleGrid, Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import { IconExternalLink, IconRefresh } from '@tabler/icons-react';
import { useAdmin } from '@/context/AdminContext';
import { ApiError, DJANGO_ADMIN_URL, getStaffReports, reviewIssueReport } from '@/lib/api';
import { REPORT_REASONS } from '@/lib/reportStorage';
import type { IssueReport, PaginatedResponse } from '@/lib/types';
import { formatCLP } from '@/lib/utils';

const DATE = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago',
});
const reasons = [...REPORT_REASONS.game, ...REPORT_REASONS.product];
const reasonLabel = (value: string) => reasons.find(reason => reason.value === value)?.label ?? value;

function safeExternalUrl(value?: string): string | undefined {
    if (!value) return undefined;
    try { return ['http:', 'https:'].includes(new URL(value).protocol) ? value : undefined; }
    catch { return undefined; }
}

export default function ReportsStaffClient() {
    const { isAdmin } = useAdmin();
    const [data, setData] = useState<PaginatedResponse<IssueReport> | null>(null);
    const [targetType, setTargetType] = useState('');
    const [reason, setReason] = useState('');
    const [reviewed, setReviewed] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 250);
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<number[]>([]);
    const queryKey = JSON.stringify([page, targetType, reason, reviewed, debouncedSearch]);
    const activeQuery = useRef(queryKey);
    activeQuery.current = queryKey;

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        getStaffReports({ page, target_type: targetType, reason, reviewed, search: debouncedSearch })
            .then(result => { if (!cancelled) setData(result); })
            .catch(error => {
                if (cancelled) return;
                // Reviews in another tab (or concurrent reviews here) can empty
                // the final page while this request is in flight.
                if (error instanceof ApiError && error.status === 404 && page > 1) {
                    setPage(1);
                } else {
                    setError('No se pudieron cargar los reportes.');
                }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isAdmin, page, targetType, reason, reviewed, debouncedSearch, refresh]);

    const markReviewed = async (report: IssueReport, value: boolean) => {
        setSaving(ids => [...ids, report.id]);
        setError(null);
        try {
            const updated = await reviewIssueReport(report.id, value);
            if (activeQuery.current === queryKey) {
                setData(current => current ? { ...current, results: current.results.map(row => row.id === updated.id ? updated : row) } : current);
                if (reviewed !== '' && String(value) !== reviewed && data?.results.length === 1 && page > 1) {
                    setPage(current => Math.max(1, current - 1));
                }
            }
            setRefresh(n => n + 1);
        } catch {
            setError('No se pudo actualizar el reporte. Inténtalo de nuevo.');
        } finally {
            setSaving(ids => ids.filter(id => id !== report.id));
        }
    };

    if (!isAdmin) return (
        <Container size="sm" py={60}>
            <Alert color="yellow" title="Necesitas iniciar sesión">
                Este panel es solo para administradores.{' '}
                <Anchor component={Link} href="/staff">Ir al inicio de sesión</Anchor>.
            </Alert>
        </Container>
    );

    return (
        <Container size="xl" py="xl">
            <Stack>
                <Group justify="space-between">
                    <Title order={1}>Reportes</Title>
                    <Group gap="xs">
                        <Button component={Link} href="/staff" variant="subtle">Panel de PIO</Button>
                        <Button component="a" href={`${DJANGO_ADMIN_URL}games/issuereport/`} target="_blank" rel="noopener noreferrer"
                            variant="default" rightSection={<IconExternalLink size={16} />}>Django admin</Button>
                        <Button onClick={() => setRefresh(n => n + 1)} leftSection={<IconRefresh size={16} />}>Actualizar</Button>
                    </Group>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                    <TextInput label="Buscar" placeholder="Juego, producto o tienda" value={search}
                        onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} />
                    <Select label="Tipo" value={targetType} allowDeselect={false} data={[
                        { value: '', label: 'Todos' }, { value: 'game', label: 'Juegos' }, { value: 'product', label: 'Productos' },
                    ]} onChange={value => { setTargetType(value ?? ''); setReason(''); setPage(1); }} />
                    <Select label="Motivo" value={reason} allowDeselect={false} data={[
                        { value: '', label: 'Todos' }, ...(targetType === 'game' ? REPORT_REASONS.game : targetType === 'product' ? REPORT_REASONS.product : reasons),
                    ]} onChange={value => { setReason(value ?? ''); setPage(1); }} />
                    <Select label="Estado" value={reviewed} allowDeselect={false} data={[
                        { value: '', label: 'Todos' }, { value: 'false', label: 'Pendientes' }, { value: 'true', label: 'Revisados' },
                    ]} onChange={value => { setReviewed(value ?? ''); setPage(1); }} />
                </SimpleGrid>
                {error && <Alert role="alert" color="red">{error}</Alert>}
                {loading && <Group justify="center"><Loader size="sm" /></Group>}
                {!loading && data?.count === 0 && <Text c="dimmed">No hay reportes con estos filtros.</Text>}
                {data && data.results.length > 0 && (
                    <ScrollArea>
                        <Table miw={760} verticalSpacing="sm" striped highlightOnHover>
                            <Table.Thead><Table.Tr>
                                {['Fecha', 'Tipo', 'Elemento', 'Motivo', 'Contexto', 'Revisado'].map(label => <Table.Th key={label}>{label}</Table.Th>)}
                            </Table.Tr></Table.Thead>
                            <Table.Tbody>{data.results.map(report => {
                                const source = safeExternalUrl(report.snapshot.url);
                                const image = safeExternalUrl(report.context.image_url || report.snapshot.image_url);
                                return (
                                    <Table.Tr key={report.id}>
                                        <Table.Td><Text size="sm" style={{ whiteSpace: 'nowrap' }}>{DATE.format(new Date(report.created_at))}</Text></Table.Td>
                                        <Table.Td><Badge variant="light">{report.target_type === 'game' ? 'Juego' : 'Producto'}</Badge></Table.Td>
                                        <Table.Td>
                                            <Text fw={600} size="sm">{report.target_name}</Text>
                                            <Text size="xs" c="dimmed">ID {report.target_id}</Text>
                                            {report.game && <Anchor component={Link} href={`/juego/${report.game}`} size="xs">Ver juego</Anchor>}
                                        </Table.Td>
                                        <Table.Td><Text size="sm">{reasonLabel(report.reason)}</Text></Table.Td>
                                        <Table.Td>
                                            <Stack gap={2} maw={270}>
                                                {report.snapshot.seller && <Text size="sm">{report.snapshot.seller}</Text>}
                                                {report.snapshot.game_name && report.target_type === 'product' && <Text size="xs">{report.snapshot.game_name}</Text>}
                                                {(report.context.platform || report.snapshot.platform_label) && <Text size="xs">Consola: {report.context.platform || report.snapshot.platform_label}</Text>}
                                                {report.snapshot.price && <Text size="xs">Precio registrado: {formatCLP(report.snapshot.price)}</Text>}
                                                {report.context.displayed_price && <Text size="xs">Precio mostrado: {formatCLP(report.context.displayed_price)}</Text>}
                                                {source && <Anchor href={source} target="_blank" rel="noopener noreferrer" size="xs">Ver producto en tienda</Anchor>}
                                                {image && <Anchor href={image} target="_blank" rel="noopener noreferrer" size="xs">Ver imagen reportada</Anchor>}
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td><Checkbox aria-label={`Revisado: ${report.target_name}`} checked={report.reviewed}
                                            disabled={saving.includes(report.id)} onChange={event => void markReviewed(report, event.currentTarget.checked)} /></Table.Td>
                                    </Table.Tr>
                                );
                            })}</Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
                {data && <Group justify="space-between"><Text size="sm" c="dimmed">{data.count} reportes</Text>
                    <Pagination total={Math.max(1, Math.ceil(data.count / 24))} value={page} onChange={setPage} /></Group>}
            </Stack>
        </Container>
    );
}
