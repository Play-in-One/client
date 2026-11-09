import { Box, Container, Group, Paper, Select, Skeleton, Stack, Text, Title } from '@mantine/core';
import GameGridSkeleton from '@/components/GameGridSkeleton';
import SkeletonLine from '@/components/skeleton/SkeletonLine';
import { CATALOG_GRID, type GridLayout } from '@/lib/gridLayout';

/**
 * Esqueleto de `GameExplorer` con su MISMA estructura: cabecera (título y
 * contador), la barra de búsqueda y orden, y el layout de dos columnas
 * (`.pio-explorer-layout`) con el panel de filtros de 240 px desde 62em. El
 * esqueleto anterior de `/search` era un título y la grilla a todo el ancho:
 * al llegar la página la grilla bajaba ~180 px y cada tarjeta se encogía de
 * ~416 a ~325 px porque aparecía la barra lateral.
 *
 * Sin `'use client'`: lo renderizan `loading.tsx` del servidor.
 */
export default function ExplorerSkeleton({
    header = true,
    longTitle = false,
    searchInput = true,
    count = 24,
    grid = CATALOG_GRID,
    withContainer = true,
}: {
    header?: boolean;
    /** El título es una búsqueda («Resultados para "…"»), no «Explorar Juegos». */
    longTitle?: boolean;
    searchInput?: boolean;
    count?: number;
    grid?: GridLayout;
    withContainer?: boolean;
}) {
    const content = (
        <Box aria-busy="true" data-skeleton="explorer">
            {header && (
                <Group justify="space-between" align="flex-start" gap="md" mb="xl">
                    {/* En un teléfono el título ocupa la fila y el botón de
                        consolas baja a la siguiente, como en la cabecera real. */}
                    <Box miw={{ base: '100%', sm: 0 }} style={{ flex: '1 1 auto' }}>
                        <Title order={1} component="div" fz={{ base: 28, md: 36 }} fw={700} mb="xs">
                            <SkeletonLine width="min(320px, 80%)" />
                            {/* «Resultados para "…"» ocupa dos líneas en un teléfono. */}
                            {longTitle && <><br /><Skeleton display="inline-block" hiddenFrom="sm" height="0.8em" width="45%" radius="sm" style={{ verticalAlign: 'middle' }} /></>}
                        </Title>
                        <Text component="div"><SkeletonLine width={150} /></Text>
                    </Box>
                    {/* `FindConsoleButton` (md, 42 px): a todo el ancho y con
                        12 px debajo por debajo de 36em, como su CSS. */}
                    <Skeleton height={42} w={{ base: '100%', xs: 240 }} mb={{ base: 'sm', xs: 0 }} radius="xl" />
                </Group>
            )}

            {/* FilterToolbar: buscador (36 px), «Ordenar por» con su etiqueta
                y el botón de filtros que solo existe por debajo de 62em. */}
            <Group mb="xl" gap="md" align="flex-end" wrap="wrap">
                {searchInput && <Skeleton height={36} radius="md" style={{ flex: 1, minWidth: 240 }} />}
                {/* El mismo Select (deshabilitado): su etiqueta y su caja miden
                    lo que las reales sin copiar números de Mantine. */}
                <Select label="Ordenar por" data={[]} disabled size="sm" radius="md" w={210} aria-hidden tabIndex={-1} />
                <Skeleton height={34} width={34} radius="md" hiddenFrom="md" />
            </Group>

            <Box className="pio-explorer-layout">
                <Paper withBorder radius="lg" p="lg" className="pio-explorer-filters" aria-hidden>
                    <Group gap="2xs" mb="md">
                        <Skeleton height={18} width={18} radius="sm" />
                        <Text component="div" fw={700} fz="md"><SkeletonLine width={60} /></Text>
                    </Group>
                    <Stack gap="lg">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Stack key={i} gap="xs">
                                <Text component="div" fw={600} fz="sm"><SkeletonLine width="50%" /></Text>
                                <Skeleton height={28} radius="md" />
                                <Skeleton height={28} width="80%" radius="md" />
                            </Stack>
                        ))}
                    </Stack>
                </Paper>
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <GameGridSkeleton count={count} grid={grid} />
                </Box>
            </Box>
        </Box>
    );
    return withContainer ? <Container size="xl" py="xl">{content}</Container> : content;
}
