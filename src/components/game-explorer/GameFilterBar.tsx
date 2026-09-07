'use client';

import { useState } from 'react';
import {
    ActionIcon,
    Box,
    Button,
    Checkbox,
    Collapse,
    Divider,
    Group,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {
    IconAdjustmentsHorizontal,
    IconChevronDown,
    IconFilter,
    IconGitMerge,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import { useAdmin } from '@/context/AdminContext';
import type { Genre, GameFacets, Platform } from '@/lib/types';

/* ── Collapsible Filter Section ── */
function FilterSection({
    title,
    open,
    onToggle,
    children,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Box>
            <Group
                justify="space-between"
                onClick={onToggle}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                py={4}
            >
                <Text fw={700} fz="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: 1 }}>
                    {title}
                </Text>
                <IconChevronDown
                    size={14}
                    color="var(--mantine-color-dimmed)"
                    style={{
                        transform: open ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s',
                    }}
                />
            </Group>
            <Collapse in={open}>
                <Box mt="xs">{children}</Box>
            </Collapse>
        </Box>
    );
}

function CheckboxLabel({ text, count }: { text: string; count?: number }) {
    return (
        <Group gap={6} wrap="nowrap">
            <Text fz="sm" span>{text}</Text>
            {count !== undefined && (
                <Text fz="xs" c="dimmed" span>({count})</Text>
            )}
        </Group>
    );
}

const ORDERING_DATA = [
    {
        group: 'Popularidad',
        items: [
            { value: '-traffic_score,name', label: 'Más populares' },
            { value: '-traffic_views,name', label: 'Más vistos' },
            { value: '-traffic_saves,name', label: 'Más guardados' },
            { value: '-traffic_offer_clicks,name', label: 'Más visitas a la tienda' },
        ],
    },
    {
        group: 'Nombre',
        items: [
            { value: 'name', label: 'Nombre A-Z' },
            { value: '-name', label: 'Nombre Z-A' },
        ],
    },
    {
        group: 'Lanzamiento',
        items: [
            { value: '-release_date', label: 'Más recientes' },
            { value: 'release_date', label: 'Más antiguos' },
        ],
    },
    {
        group: 'Precio',
        items: [
            { value: 'min_price', label: 'Menor precio' },
            { value: '-min_price', label: 'Mayor precio' },
        ],
    },
];

interface ToolbarProps {
    showSearchInput: boolean;
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    onSearchSubmit: () => void;
    ordering: string;
    defaultOrdering: string;
    onOrderingChange: (value: string) => void;
    selectionMode: boolean;
    onToggleSelectionMode: () => void;
    hasActiveFilters: boolean;
    filtersOpen: boolean;
    onToggleFiltersOpen: () => void;
}

/** La barra superior: buscador de texto (opcional), orden, botón admin de
 *  fusión y el toggle de filtros en móvil. */
export function FilterToolbar({
    showSearchInput,
    searchInput,
    onSearchInputChange,
    onSearchSubmit,
    ordering,
    defaultOrdering,
    onOrderingChange,
    selectionMode,
    onToggleSelectionMode,
    hasActiveFilters,
    filtersOpen,
    onToggleFiltersOpen,
}: ToolbarProps) {
    const { isAdmin } = useAdmin();

    return (
        <Group mb="xl" gap="md" align="flex-end" wrap="wrap">
            {showSearchInput && (
                <Group gap={0} style={{ flex: 1, minWidth: 240 }}>
                    <TextInput
                        placeholder="Buscar juegos..."
                        leftSection={<IconSearch size={18} />}
                        value={searchInput}
                        onChange={(e) => onSearchInputChange(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                        radius="md"
                        size="sm"
                        style={{ flex: 1 }}
                        styles={{
                            input: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
                        }}
                    />
                    <Button
                        size="sm"
                        radius="md"
                        color="primaryRed"
                        onClick={onSearchSubmit}
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                    >
                        <IconSearch size={16} />
                    </Button>
                </Group>
            )}

            <Select
                label="Ordenar por"
                data={ORDERING_DATA}
                value={ordering}
                onChange={(v) => onOrderingChange(v ?? defaultOrdering)}
                size="sm"
                radius="md"
                w={210}
                leftSection={<IconFilter size={16} />}
            />

            {/* Admin: activar selección para fusionar juegos */}
            {isAdmin && (
                <Button
                    size="sm"
                    radius="md"
                    variant={selectionMode ? 'filled' : 'default'}
                    color={selectionMode ? 'yellow' : undefined}
                    leftSection={<IconGitMerge size={16} />}
                    onClick={onToggleSelectionMode}
                >
                    {selectionMode ? 'Cancelar selección' : 'Fusionar juegos'}
                </Button>
            )}

            {/* Mobile filter toggle */}
            <ActionIcon
                variant={hasActiveFilters ? 'filled' : 'default'}
                color={hasActiveFilters ? 'primaryRed' : undefined}
                size="lg"
                radius="md"
                hiddenFrom="md"
                onClick={onToggleFiltersOpen}
                aria-label="Filtros"
            >
                <IconAdjustmentsHorizontal size={20} />
            </ActionIcon>
        </Group>
    );
}

interface Props {
    priceMinInput: string | number;
    priceMaxInput: string | number;
    onPriceMinInputChange: (value: string | number) => void;
    onPriceMaxInputChange: (value: string | number) => void;
    onApplyPriceMin: () => void;
    onApplyPriceMax: () => void;

    showPlatformSection: boolean;
    platforms: Platform[];
    selectedPlatforms: number[];
    onTogglePlatform: (id: number) => void;
    onClearPlatforms: () => void;

    genres: Genre[];
    selectedGenre: number | null;
    onSelectGenre: (id: number | null) => void;

    onSale: boolean;
    onToggleOnSale: () => void;

    facets: GameFacets;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
}

/** El contenido de filtros del sidebar: precio, plataforma (opcional), género
 *  y "en oferta". El padre decide cómo se envuelve (Paper fijo en desktop,
 *  Collapse en móvil). */
export default function GameFilterBar({
    priceMinInput,
    priceMaxInput,
    onPriceMinInputChange,
    onPriceMaxInputChange,
    onApplyPriceMin,
    onApplyPriceMax,
    showPlatformSection,
    platforms,
    selectedPlatforms,
    onTogglePlatform,
    onClearPlatforms,
    genres,
    selectedGenre,
    onSelectGenre,
    onSale,
    onToggleOnSale,
    facets,
    hasActiveFilters,
    onClearFilters,
}: Props) {
    const [platformsOpen, setPlatformsOpen] = useState(true);
    const [genresOpen, setGenresOpen] = useState(true);
    const [priceOpen, setPriceOpen] = useState(true);
    const [saleOpen, setSaleOpen] = useState(true);

    return (
        <Stack gap="sm">
            {/* Price */}
            <FilterSection title="Precio" open={priceOpen} onToggle={() => setPriceOpen((v) => !v)}>
                <Group gap="xs" grow>
                    <NumberInput
                        placeholder="Mín"
                        value={priceMinInput}
                        onChange={onPriceMinInputChange}
                        onBlur={onApplyPriceMin}
                        onKeyDown={(e) => e.key === 'Enter' && onApplyPriceMin()}
                        min={0}
                        size="xs"
                        radius="md"
                        prefix="$"
                        thousandSeparator="."
                        decimalSeparator=","
                        hideControls
                    />
                    <NumberInput
                        placeholder="Máx"
                        value={priceMaxInput}
                        onChange={onPriceMaxInputChange}
                        onBlur={onApplyPriceMax}
                        onKeyDown={(e) => e.key === 'Enter' && onApplyPriceMax()}
                        min={0}
                        size="xs"
                        radius="md"
                        prefix="$"
                        thousandSeparator="."
                        decimalSeparator=","
                        hideControls
                    />
                </Group>
            </FilterSection>

            <Divider />

            {/* En oferta */}
            <FilterSection title="Ofertas" open={saleOpen} onToggle={() => setSaleOpen((v) => !v)}>
                <Checkbox
                    label="En oferta"
                    checked={onSale}
                    onChange={onToggleOnSale}
                    color="primaryRed"
                    radius="sm"
                    styles={{
                        label: { cursor: 'pointer', fontSize: 14 },
                        input: { cursor: 'pointer' },
                    }}
                />
            </FilterSection>

            {showPlatformSection && (
                <>
                    <Divider />
                    <FilterSection title="Plataforma" open={platformsOpen} onToggle={() => setPlatformsOpen((v) => !v)}>
                        <Stack gap={6}>
                            <Checkbox
                                label="Todos"
                                checked={selectedPlatforms.length === 0}
                                onChange={onClearPlatforms}
                                color="primaryRed"
                                radius="sm"
                                styles={{
                                    label: { cursor: 'pointer', fontSize: 14 },
                                    input: { cursor: 'pointer' },
                                }}
                            />
                            {platforms.map((p) => (
                                <Checkbox
                                    key={p.id}
                                    label={<CheckboxLabel text={p.display_name} count={facets.platforms[p.id] ?? 0} />}
                                    checked={selectedPlatforms.includes(p.id)}
                                    onChange={() => onTogglePlatform(p.id)}
                                    color="primaryRed"
                                    radius="sm"
                                    styles={{
                                        label: { cursor: 'pointer', fontSize: 14 },
                                        input: { cursor: 'pointer' },
                                    }}
                                />
                            ))}
                        </Stack>
                    </FilterSection>
                </>
            )}

            <Divider />

            {/* Genres */}
            <FilterSection title="Género" open={genresOpen} onToggle={() => setGenresOpen((v) => !v)}>
                <Stack gap={6}>
                    <Checkbox
                        label="Todos"
                        checked={selectedGenre === null}
                        onChange={() => onSelectGenre(null)}
                        color="primaryRed"
                        radius="sm"
                        styles={{
                            label: { cursor: 'pointer', fontSize: 14 },
                            input: { cursor: 'pointer' },
                        }}
                    />
                    {genres.map((g) => (
                        <Checkbox
                            key={g.id}
                            label={<CheckboxLabel text={g.name} count={facets.genres[g.id] ?? 0} />}
                            checked={selectedGenre === g.id}
                            onChange={() => onSelectGenre(selectedGenre === g.id ? null : g.id)}
                            color="primaryRed"
                            radius="sm"
                            styles={{
                                label: { cursor: 'pointer', fontSize: 14 },
                                input: { cursor: 'pointer' },
                            }}
                        />
                    ))}
                </Stack>
            </FilterSection>

            {hasActiveFilters && (
                <>
                    <Divider />
                    <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        leftSection={<IconX size={14} />}
                        onClick={onClearFilters}
                        fullWidth
                    >
                        Limpiar filtros
                    </Button>
                </>
            )}
        </Stack>
    );
}
