'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Anchor, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { getConsoles } from '@/lib/api';
import type { ConsoleModel, ConsoleQuery } from '@/lib/consoles';
import type { PaginatedResponse } from '@/lib/types';
import { ConsoleCard } from './ConsoleCard';
import { useConsoleRequest } from './useConsoleRequest';

export function StoreConsoleCatalog({ seller, initialData }: { seller: number; initialData: PaginatedResponse<ConsoleModel> }) {
    const load = useCallback((q: ConsoleQuery, signal: AbortSignal) => getConsoles(q, { signal }), []);
    const { data } = useConsoleRequest(initialData, { seller, page_size: 6 }, load);
    return (
        <Container size="lg" pb="xl" data-ui>
            <Group justify="space-between" mb="lg">
                <Title order={2} fz="lg" fw={700}>Consolas en esta tienda</Title>
                <Anchor component={Link} href={`/consolas?seller=${seller}`} fw={600} fz="sm" c="var(--pio-brand-text)">Ver todas ({data?.count ?? 0})</Anchor>
            </Group>
            {data?.results.length
                ? <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">{data.results.map(model => <ConsoleCard key={model.id} model={model} />)}</SimpleGrid>
                : <Text c="dimmed">No hay consolas para tus preferencias.</Text>}
        </Container>
    );
}
