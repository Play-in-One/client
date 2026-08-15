'use client';

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Box,
    Select,
    Group,
    Pagination,
    Loader,
    Stack,
    TextInput,
    Button,
    Checkbox,
    Divider,
    ActionIcon,
    Collapse,
    Paper,
    NumberInput,
    ScrollArea,
    Affix,
    Alert,
} from '@mantine/core';
import {
    IconSearch,
    IconFilter,
    IconX,
    IconAdjustmentsHorizontal,
    IconChevronDown,
    IconGitMerge,
} from '@tabler/icons-react';
import { getGames, getGameFacets, getPlatforms, getGenres, getSellers, trackEvent, mergeGames, ApiError } from '@/lib/api';
import type { Game, Platform, Genre, Seller, GameFacets } from '@/lib/types';
import GameCard from '@/components/GameCard';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';

/* Debe coincidir con API_PAGE_SIZE del backend (default 24). El backend no
   expone page_size como query param, así que el frontend fija el mismo valor. */
const GAMES_PAGE_SIZE = 24;

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

function SearchContent() {
    const router = useRouter();
    const params = useSearchParams();
    const { condition } = useApp();
    const { isAdmin } = useAdmin();
    const q = params.get('q') ?? '';
    const platformSlug = params.get('platform') ?? '';
    const [games, setGames] = useState<Game[]>([]);
    const [facets, setFacets] = useState<GameFacets>({ platforms: {}, genres: {}, sellers: {} });
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(q);
    const [activeQuery, setActiveQuery] = useState(q);
    const [ordering, setOrdering] = useState<string>('name');

    /* ── Filter options (fetched once on mount, no bloquean el shell) ── */
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);

    /* ── Active filter selections ── */
    /* Platform is derived from the URL — the URL is the single source of truth,
       so header links and the sidebar selector stay in sync automatically. */
    const selectedPlatforms = useMemo(() => {
        if (!platformSlug) return [];
        const slugs = platformSlug.split(',').map((s) => s.trim()).filter(Boolean);
        return platforms.filter((p) => slugs.includes(p.slug)).map((p) => p.id);
    }, [platformSlug, platforms]);
    /* Deep-link del detalle a la pestaña de consola correcta: con 2+
       plataformas filtradas, cada juego puede tener stock en solo una de
       ellas, así que la pestaña se resuelve por juego (intersección de sus
       plataformas con las filtradas), no con un único slug global — si no,
       el detalle abría en la primera plataforma del juego (a veces sin
       stock) en vez de la que realmente coincide con el filtro/tarjeta. */
    const platformSlugFor = (game: Game) => {
        if (selectedPlatforms.length === 0) return undefined;
        return game.platforms.find((p) => selectedPlatforms.includes(p.id))?.slug;
    };

    const setPlatformFilter = (nextIds: number[]) => {
        const nextSlugs = platforms.filter((p) => nextIds.includes(p.id)).map((p) => p.slug);
        const usp = new URLSearchParams(params.toString());
        if (nextSlugs.length) usp.set('platform', nextSlugs.join(',')); else usp.delete('platform');
        router.replace(`/search?${usp.toString()}`, { scroll: false });
        setPage(1);
    };

    const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
    const [selectedSeller, setSelectedSeller] = useState<number | null>(null);
    const [priceMin, setPriceMin] = useState<number | undefined>(undefined);
    const [priceMax, setPriceMax] = useState<number | undefined>(undefined);
    const [priceMinInput, setPriceMinInput] = useState<string | number>('');
    const [priceMaxInput, setPriceMaxInput] = useState<string | number>('');
    const [onSale, setOnSale] = useState(false);

    /* ── Collapsible section states ── */
    const [platformsOpen, setPlatformsOpen] = useState(true);
    const [genresOpen, setGenresOpen] = useState(true);
    const [sellersOpen, setSellersOpen] = useState(true);
    const [priceOpen, setPriceOpen] = useState(true);

    /* ── Mobile sidebar toggle ── */
    const [filtersOpen, setFiltersOpen] = useState(false);

    /* ── Selección/fusión admin ── */
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState<{ id: number; name: string }[]>([]);
    const [targetId, setTargetId] = useState<number | null>(null);
    const [merging, setMerging] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);
    // Se incrementa tras una fusión para re-consultar la lista de juegos.
    const [refreshKey, setRefreshKey] = useState(0);

    const toggleSelect = useCallback((id: number) => {
        setMergeError(null);
        setSelected((prev) => {
            if (prev.some((s) => s.id === id)) {
                const next = prev.filter((s) => s.id !== id);
                setTargetId((t) => (t === id ? next[0]?.id ?? null : t));
                return next;
            }
            const g = games.find((x) => x.id === id);
            const next = [...prev, { id, name: g?.name ?? `#${id}` }];
            setTargetId((t) => t ?? id); // por defecto, el primero es el destino
            return next;
        });
    }, [games]);

    const exitSelection = () => {
        setSelectionMode(false);
        setSelected([]);
        setTargetId(null);
        setMergeError(null);
    };

    const effectiveTarget = targetId ?? selected[0]?.id ?? null;

    const handleMerge = async () => {
        if (!effectiveTarget || selected.length < 2) return;
        const sources = selected.filter((s) => s.id !== effectiveTarget).map((s) => s.id);
        setMerging(true);
        setMergeError(null);
        try {
            await mergeGames(effectiveTarget, sources);
            exitSelection();
            setPage(1);
            setRefreshKey((k) => k + 1); // recarga la galería con los cambios
        } catch (e) {
            if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
                setMergeError('Tu sesión de administrador expiró. Vuelve a entrar en /staff.');
            } else {
                setMergeError(e instanceof Error ? e.message : 'No se pudo fusionar.');
            }
        } finally {
            setMerging(false);
        }
    };

    /* Fetch filter options once on mount — platform selection itself is derived
       from the URL (see `selectedPlatforms` above), so this no longer needs to
       depend on `platformSlug`. */
    useEffect(() => {
        getPlatforms()
            .then((res) => setPlatforms(res.results))
            .catch(() => { });
        getGenres()
            .then((res) => setGenres(res.results))
            .catch(() => { });
        getSellers()
            .then((res) => setSellers(res.results))
            .catch(() => { });
    }, []);

    useEffect(() => {
        setActiveQuery(q);
        setSearchInput(q);
        setPage(1);
    }, [q]);

    /* ── Popularity tracking ──
       All searches (Navbar, home, saga links) converge on /search?q=, and all
       console selections (header menu, home cards, sidebar) converge on the
       ?platform= param — so these two effects capture every entry point. */
    useEffect(() => {
        const query = q.trim();
        if (query) trackEvent({ event_type: 'search', search_query: query });
    }, [q]);

    const trackedPlatforms = useRef<Set<number>>(new Set());
    useEffect(() => {
        // Track only newly-added consoles so re-renders / removals don't inflate counts.
        for (const id of selectedPlatforms) {
            if (!trackedPlatforms.current.has(id)) {
                trackedPlatforms.current.add(id);
                trackEvent({ event_type: 'platform_select', platform: id });
            }
        }
    }, [selectedPlatforms]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        getGames({
            search: activeQuery || undefined,
            platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
            genres: selectedGenre ?? undefined,
            seller: selectedSeller ?? undefined,
            condition: condition !== 'all' ? condition : undefined,
            price_min: priceMin,
            price_max: priceMax,
            on_sale: onSale || undefined,
            ordering,
            page,
            signal: controller.signal,
        })
            .then((res) => {
                setGames(res.results);
                setTotal(res.count);
            })
            .catch((err) => { if (err?.name !== 'AbortError') setGames([]); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [activeQuery, ordering, page, selectedPlatforms, selectedGenre, selectedSeller, condition, priceMin, priceMax, onSale, refreshKey]);

    /* ── Facet counts (how many games each filter option would yield, given
       every other currently active filter) — recomputed whenever the active
       filters change, independent of pagination/ordering. ── */
    useEffect(() => {
        const controller = new AbortController();
        getGameFacets({
            search: activeQuery || undefined,
            platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
            genres: selectedGenre ?? undefined,
            seller: selectedSeller ?? undefined,
            condition: condition !== 'all' ? condition : undefined,
            price_min: priceMin,
            price_max: priceMax,
            on_sale: onSale || undefined,
            signal: controller.signal,
        })
            .then(setFacets)
            .catch((err) => { if (err?.name !== 'AbortError') setFacets({ platforms: {}, genres: {}, sellers: {} }); });
        return () => controller.abort();
    }, [activeQuery, selectedPlatforms, selectedGenre, selectedSeller, condition, priceMin, priceMax, onSale]);

    const totalPages = Math.ceil(total / GAMES_PAGE_SIZE);

    const handleLocalSearch = () => {
        setActiveQuery(searchInput);
        setPage(1);
    };

    const handleClearFilters = () => {
        setPlatformFilter([]);
        setSelectedGenre(null);
        setSelectedSeller(null);
        setPriceMin(undefined);
        setPriceMax(undefined);
        setPriceMinInput('');
        setPriceMaxInput('');
        setOnSale(false);
        setPage(1);
    };

    const applyPriceMin = () => {
        setPriceMin(typeof priceMinInput === 'number' ? priceMinInput : undefined);
        setPage(1);
    };

    const applyPriceMax = () => {
        setPriceMax(typeof priceMaxInput === 'number' ? priceMaxInput : undefined);
        setPage(1);
    };

    const hasActiveFilters =
        selectedPlatforms.length > 0 ||
        selectedGenre !== null ||
        selectedSeller !== null ||
        priceMin !== undefined ||
        priceMax !== undefined ||
        onSale;

    /* ── Filter Sidebar Content ── */
    const filterContent = (
        <Stack gap="sm">

            {/* Price */}
            <FilterSection title="Precio" open={priceOpen} onToggle={() => setPriceOpen((v) => !v)}>
                <Group gap="xs" grow>
                    <NumberInput
                        placeholder="Mín"
                        value={priceMinInput}
                        onChange={setPriceMinInput}
                        onBlur={applyPriceMin}
                        onKeyDown={(e) => e.key === 'Enter' && applyPriceMin()}
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
                        onChange={setPriceMaxInput}
                        onBlur={applyPriceMax}
                        onKeyDown={(e) => e.key === 'Enter' && applyPriceMax()}
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

            {/* Platforms */}
            <FilterSection title="Plataforma" open={platformsOpen} onToggle={() => setPlatformsOpen((v) => !v)}>
                <Stack gap={6}>
                    <Checkbox
                        label="Todos"
                        checked={selectedPlatforms.length === 0}
                        onChange={() => setPlatformFilter([])}
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
                            onChange={() => {
                                setPlatformFilter(
                                    selectedPlatforms.includes(p.id)
                                        ? selectedPlatforms.filter((id) => id !== p.id)
                                        : [...selectedPlatforms, p.id]
                                );
                            }}
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

            <Divider />

            {/* Genres */}
            <FilterSection title="Género" open={genresOpen} onToggle={() => setGenresOpen((v) => !v)}>
                <Stack gap={6}>
                    <Checkbox
                        label="Todos"
                        checked={selectedGenre === null}
                        onChange={() => {
                            setSelectedGenre(null);
                            setPage(1);
                        }}
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
                            onChange={() => {
                                setSelectedGenre(selectedGenre === g.id ? null : g.id);
                                setPage(1);
                            }}
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

            <Divider />

            {/* Sellers */}
            <FilterSection title="Tienda" open={sellersOpen} onToggle={() => setSellersOpen((v) => !v)}>
                <Stack gap={6}>
                    <Checkbox
                        label="Todos"
                        checked={selectedSeller === null}
                        onChange={() => {
                            setSelectedSeller(null);
                            setPage(1);
                        }}
                        color="primaryRed"
                        radius="sm"
                        styles={{
                            label: { cursor: 'pointer', fontSize: 14 },
                            input: { cursor: 'pointer' },
                        }}
                    />
                    {sellers.map((s) => (
                        <Checkbox
                            key={s.id}
                            label={<CheckboxLabel text={s.name} count={facets.sellers[s.id] ?? 0} />}
                            checked={selectedSeller === s.id}
                            onChange={() => {
                                setSelectedSeller(selectedSeller === s.id ? null : s.id);
                                setPage(1);
                            }}
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
                        onClick={handleClearFilters}
                        fullWidth
                    >
                        Limpiar filtros
                    </Button>
                </>
            )}
        </Stack>
    );

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Box mb="xl">
                <Title order={1} fz={{ base: 28, md: 36 }} fw={700} mb="xs">
                    {activeQuery ? `Resultados para "${activeQuery}"` : 'Explorar Juegos'}
                </Title>
                <Text c="dimmed">
                    {total} juego{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                </Text>
            </Box>

            {/* Filters bar */}
            <Group mb="xl" gap="md" align="flex-end" wrap="wrap">
                <Group gap={0} style={{ flex: 1, minWidth: 240 }}>
                    <TextInput
                        placeholder="Buscar juegos..."
                        leftSection={<IconSearch size={18} />}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLocalSearch()}
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
                        onClick={handleLocalSearch}
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                    >
                        <IconSearch size={16} />
                    </Button>
                </Group>

                <Select
                    label="Ordenar por"
                    data={[
                        { value: 'name', label: 'Nombre A-Z' },
                        { value: '-name', label: 'Nombre Z-A' },
                        { value: 'release_date', label: 'Más antiguos' },
                        { value: '-release_date', label: 'Más recientes' },
                        { value: 'min_price', label: 'Menor precio' },
                        { value: '-min_price', label: 'Mayor precio' },
                    ]}
                    value={ordering}
                    onChange={(v) => { setOrdering(v ?? 'name'); setPage(1); }}
                    size="sm"
                    radius="md"
                    w={180}
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
                        onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
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
                    onClick={() => setFiltersOpen((o) => !o)}
                    aria-label="Filtros"
                >
                    <IconAdjustmentsHorizontal size={20} />
                </ActionIcon>
            </Group>

            {/* Mobile filters collapse */}
            <Box hiddenFrom="md" mb="lg">
                <Collapse in={filtersOpen}>
                    <Paper
                        withBorder
                        radius="lg"
                        p="lg"
                        style={{
                            borderColor: hasActiveFilters
                                ? 'var(--mantine-color-primaryRed-5)'
                                : undefined,
                        }}
                    >
                        {filterContent}
                    </Paper>
                </Collapse>
            </Box>

            {/* Two-column layout: sidebar + results */}
            <Box
                style={{
                    display: 'flex',
                    gap: 'var(--mantine-spacing-xl)',
                    alignItems: 'flex-start',
                }}
            >
                {/* Desktop sidebar */}
                <Paper
                    withBorder
                    radius="lg"
                    p="lg"
                    w={240}
                    visibleFrom="md"
                    style={{
                        flexShrink: 0,
                        position: 'sticky',
                        top: 'calc(var(--mantine-spacing-xl) + 60px)',
                        maxHeight: 'calc(100vh - var(--mantine-spacing-xl) - 60px - var(--mantine-spacing-xl))',
                        display: 'grid',
                        gridTemplateRows: 'auto 1fr',
                        overflow: 'hidden',
                        borderColor: hasActiveFilters
                            ? 'var(--mantine-color-primaryRed-5)'
                            : undefined,
                        transition: 'border-color 0.3s',
                    }}
                >
                    <Group justify="space-between" mb="md">
                        <Group gap={6}>
                            <IconAdjustmentsHorizontal size={18} />
                            <Text fw={700} fz="md">Filtros</Text>
                        </Group>
                        {hasActiveFilters && (
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                                onClick={handleClearFilters}
                                aria-label="Limpiar filtros"
                            >
                                <IconX size={14} />
                            </ActionIcon>
                        )}
                    </Group>
                    <ScrollArea style={{ minHeight: 0 }} offsetScrollbars>
                        {filterContent}
                    </ScrollArea>
                </Paper>

                {/* Results */}
                <Box style={{ flex: 1, minWidth: 0 }}>
                    {loading ? (
                        <Stack align="center" py={80}>
                            <Loader color="primaryRed" size="lg" />
                            <Text c="dimmed">Buscando...</Text>
                        </Stack>
                    ) : games.length === 0 ? (
                        <Stack align="center" py={80}>
                            <IconSearch size={48} color="var(--mantine-color-dimmed)" />
                            <Text fw={600} fz="lg">No se encontraron resultados</Text>
                            <Text c="dimmed">Intenta con otro término de búsqueda</Text>
                        </Stack>
                    ) : (
                        <>
                            <SimpleGrid cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', xs: 'lg' }}>
                                {games.map((g, i) => (
                                    <GameCard
                                        key={g.id}
                                        game={g}
                                        platformSlug={platformSlugFor(g)}
                                        selectable={selectionMode}
                                        selected={selected.some((s) => s.id === g.id)}
                                        onToggleSelect={toggleSelect}
                                        priority={i < 4}
                                    />
                                ))}
                            </SimpleGrid>

                            {totalPages > 1 && (
                                <Group justify="center" mt="xl">
                                    <Pagination
                                        total={totalPages}
                                        value={page}
                                        onChange={setPage}
                                        color="primaryRed"
                                        radius="md"
                                    />
                                </Group>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            {/* ── Barra flotante de fusión (solo admin, modo selección) ── */}
            {isAdmin && selectionMode && selected.length > 0 && (
                <Affix position={{ bottom: 20, left: 0, right: 0 }}>
                    <Group justify="center" px="md">
                        <Paper withBorder shadow="md" radius="md" p="md" maw={720} w="100%">
                            <Stack gap="xs">
                                {mergeError && (
                                    <Alert color="red" variant="light" py={6}>{mergeError}</Alert>
                                )}
                                <Group justify="space-between" wrap="wrap" gap="md">
                                    <Text fw={600} fz="sm">
                                        {selected.length} seleccionado{selected.length !== 1 ? 's' : ''}
                                    </Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Select
                                            label={undefined}
                                            placeholder="Juego destino"
                                            data={selected.map((s) => ({ value: String(s.id), label: s.name }))}
                                            value={effectiveTarget ? String(effectiveTarget) : null}
                                            onChange={(v) => setTargetId(v ? Number(v) : null)}
                                            size="xs"
                                            radius="md"
                                            w={240}
                                            comboboxProps={{ withinPortal: true }}
                                        />
                                        <Button
                                            size="xs"
                                            color="orange"
                                            leftSection={<IconGitMerge size={16} />}
                                            loading={merging}
                                            disabled={selected.length < 2 || !effectiveTarget}
                                            onClick={handleMerge}
                                        >
                                            Fusionar {Math.max(selected.length - 1, 0)} en el destino
                                        </Button>
                                        <Button size="xs" variant="subtle" color="gray" onClick={exitSelection}>
                                            Cancelar
                                        </Button>
                                    </Group>
                                </Group>
                                <Text fz="xs" c="dimmed">
                                    El destino conserva sus datos; los demás juegos se fusionan en él
                                    (sus productos se mueven) y luego se eliminan.
                                </Text>
                            </Stack>
                        </Paper>
                    </Group>
                </Affix>
            )}
        </Container>
    );
}

export default function SearchClient() {
    return (
        <Suspense fallback={<Container py="xl"><Loader color="primaryRed" /></Container>}>
            <SearchContent />
        </Suspense>
    );
}
