'use client';

import { Group, Loader, Pagination, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import GameCard from '@/components/GameCard';
import type { Game } from '@/lib/types';

interface Props {
    games: Game[];
    loading: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    platformSlugFor: (game: Game) => string | undefined;
    selectionMode: boolean;
    selected: { id: number; name: string }[];
    onToggleSelect: (id: number) => void;
}

export default function GameResultsGrid({
    games,
    loading,
    page,
    totalPages,
    onPageChange,
    platformSlugFor,
    selectionMode,
    selected,
    onToggleSelect,
}: Props) {
    if (loading) {
        return (
            <Stack align="center" py={80}>
                <Loader color="primaryRed" size="lg" />
                <Text c="dimmed">Buscando...</Text>
            </Stack>
        );
    }

    if (games.length === 0) {
        return (
            <Stack align="center" py={80}>
                <IconSearch size={48} color="var(--mantine-color-dimmed)" />
                <Text fw={600} fz="lg">No se encontraron resultados</Text>
                <Text c="dimmed">Intenta con otro término de búsqueda</Text>
            </Stack>
        );
    }

    return (
        <>
            <SimpleGrid cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', xs: 'lg' }}>
                {games.map((g, i) => (
                    <GameCard
                        key={g.id}
                        game={g}
                        platformSlug={platformSlugFor(g)}
                        selectable={selectionMode}
                        selected={selected.some((s) => s.id === g.id)}
                        onToggleSelect={onToggleSelect}
                        priority={i < 4}
                    />
                ))}
            </SimpleGrid>

            {totalPages > 1 && (
                <Group justify="center" mt="xl">
                    <Pagination
                        total={totalPages}
                        value={page}
                        onChange={onPageChange}
                        color="primaryRed"
                        radius="md"
                    />
                </Group>
            )}
        </>
    );
}
