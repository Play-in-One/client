'use client';

import { Box, Group, Loader, Pagination, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import GameCard from '@/components/GameCard';
import DealCard from '@/components/DealCard';
import { dealFromGame } from '@/lib/deals';
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
    /** Si la tanda de ofertas es la de hoy. Solo /ofertas lo sabe y lo
     *  resuelve el SERVIDOR: un `new Date()` en el render del cliente podría
     *  caer en otro día que el del HTML cerca de la medianoche. Sin él
     *  («En oferta» en otra galería) es `false`: nunca «Nueva hoy». */
    dealsIsToday?: boolean;
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
    dealsIsToday = false,
}: Props) {
    if (loading && games.length === 0) {
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
        <Box aria-busy={loading}>
            {loading && (
                <Group justify="center" mb="md" role="status">
                    <Loader color="primaryRed" size="sm" />
                    <Text c="dimmed" size="sm">Actualizando resultados...</Text>
                </Group>
            )}
            <Box style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 150ms' }}>
            <SimpleGrid cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', xs: 'lg' }}>
                {games.map((g, i) => {
                    // Con `deals=1` u `on_sale=1` («En oferta», el mismo
                    // filtro) cada juego trae su oferta: se pinta con la
                    // MISMA tarjeta que la grilla del servidor (precio, consola,
                    // condición y tienda de la oferta, más la línea de rebaja).
                    // En modo selección manda la tarjeta seleccionable: la
                    // fusión de admin no sabe nada de ofertas.
                    const deal = selectionMode ? null : dealFromGame(g);
                    return deal ? (
                        <DealCard key={g.id} deal={deal} priority={i < 4} isToday={dealsIsToday} />
                    ) : (
                        <GameCard
                            key={g.id}
                            game={g}
                            platformSlug={platformSlugFor(g)}
                            selectable={selectionMode}
                            selected={selected.some((s) => s.id === g.id)}
                            onToggleSelect={onToggleSelect}
                            priority={i < 4}
                        />
                    );
                })}
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
            </Box>
        </Box>
    );
}
