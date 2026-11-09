'use client';

import { memo } from 'react';

import { Box, Group, Loader, Pagination, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import GameCard from '@/components/GameCard';
import DealCard from '@/components/DealCard';
import GameGridSkeleton from '@/components/GameGridSkeleton';
import { CATALOG_DEALS_GRID, CATALOG_GRID } from '@/lib/gridLayout';
import { dealFromGame, dealsRangeLabel } from '@/lib/deals';
import type { Game, ProductPreviewFilters } from '@/lib/types';

interface Props {
    games: Game[];
    previewFilters?: ProductPreviewFilters;
    loading: boolean;
    page: number;
    totalPages: number;
    dealsTotal?: number;
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
    /** La consulta lleva `deals=1` u `on_sale=1` (/ofertas o «En oferta»):
     *  el `deal` de cada juego es su MEJOR oferta, que puede no ser su mínimo,
     *  y la tarjeta tiene que mostrar el precio de esa oferta (`DealCard`).
     *  Sin el filtro, `GameCard` pone la rebaja por su cuenta junto al mínimo
     *  solo cuando ese mínimo ES la oferta. */
    dealCards?: boolean;
}

function GameResultsGrid({
    games,
    previewFilters,
    loading,
    page,
    totalPages,
    dealsTotal,
    onPageChange,
    platformSlugFor,
    selectionMode,
    selected,
    onToggleSelect,
    dealsIsToday = false,
    dealCards = false,
}: Props) {
    const grid = dealCards ? CATALOG_DEALS_GRID : CATALOG_GRID;

    /* Sin resultados todavía: la grilla en esqueleto, no un spinner. El
       spinner ocupaba ~220 px y al llegar las 24 tarjetas la página crecía
       de golpe; el esqueleto ya tiene su alto. */
    if (loading && games.length === 0) {
        return (
            <Box role="status" aria-label="Buscando juegos">
                <GameGridSkeleton count={12} grid={grid} />
            </Box>
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
            {dealsTotal !== undefined && (
                <Text size="sm" c="dimmed" mb="md" data-deals-range>
                    {dealsRangeLabel(page, dealsTotal)}
                </Text>
            )}
            <Box pos="relative">
            {/* Flota sobre la grilla en vez de abrir una fila encima: como fila
                empujaba las tarjetas ~38 px en cada cambio de filtro. */}
            {loading && (
                <Group
                    role="status"
                    gap="xs"
                    wrap="nowrap"
                    px="md"
                    py={6}
                    pos="absolute"
                    top={8}
                    left="50%"
                    style={{
                        transform: 'translateX(-50%)',
                        zIndex: 3,
                        background: 'var(--mantine-color-body)',
                        border: '1px solid var(--mantine-color-default-border)',
                        borderRadius: 'var(--mantine-radius-xl)',
                        boxShadow: 'var(--mantine-shadow-sm)',
                    }}
                >
                    <Loader color="primaryRed" size="sm" />
                    <Text c="dimmed" size="sm">Actualizando resultados...</Text>
                </Group>
            )}
            <Box style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 150ms' }}>
            <SimpleGrid {...grid}>
                {games.map((g, i) => {
                    // Con `deals=1` u `on_sale=1` («En oferta», el mismo
                    // filtro) cada juego trae su oferta: se pinta con la
                    // MISMA tarjeta que la grilla del servidor (precio, consola,
                    // condición y tienda de la oferta, más la línea de rebaja).
                    // En modo selección manda la tarjeta seleccionable: la
                    // fusión de admin no sabe nada de ofertas.
                    const deal = selectionMode || !dealCards ? null : dealFromGame(g);
                    return deal ? (
                        <DealCard key={g.id} deal={deal} previewFilters={previewFilters} priority={i < 2} isToday={dealsIsToday} />
                    ) : (
                        <GameCard
                            key={g.id}
                            game={g}
                            previewFilters={previewFilters}
                            platformSlug={platformSlugFor(g)}
                            selectable={selectionMode}
                            selected={selected.some((s) => s.id === g.id)}
                            onToggleSelect={onToggleSelect}
                            priority={i < 2}
                            dealsIsToday={dealsIsToday}
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
        </Box>
    );
}

export default memo(GameResultsGrid);
