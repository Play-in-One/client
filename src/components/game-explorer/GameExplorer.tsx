'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActionIcon,
    Affix,
    Alert,
    Box,
    Button,
    Collapse,
    Container,
    Group,
    Paper,
    ScrollArea,
    Select,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { IconAdjustmentsHorizontal, IconGitMerge, IconX } from '@tabler/icons-react';
import { getGames, getGameFacets, getPlatforms, getGenres, trackEvent, mergeGames, ApiError } from '@/lib/api';
import type { Game, Platform, Genre, GameFacets } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { useConsent } from '@/context/ConsentContext';
import GameFilterBar, { FilterToolbar } from './GameFilterBar';
import GameResultsGrid from './GameResultsGrid';

interface LockedPlatform {
    id: number;
    slug: string;
    display_name: string;
}

interface Props {
    initialGames: Game[];
    initialTotal: number;
    pageSize?: number;
    defaultOrdering: string;

    /** Consola fija (landing): no hay selector de plataforma y toda consulta
     *  se acota a esta consola. */
    lockedPlatform?: LockedPlatform;
    /** Solo cuando NO hay `lockedPlatform` (caso /search): la selección de
     *  plataforma la controla el padre (vive en la URL). */
    selectedPlatformIds?: number[];
    onPlatformFilterChange?: (ids: number[]) => void;

    showSearchInput?: boolean;
    /** Búsqueda de texto inicial (viene de la URL en /search). */
    query?: string;

    /** El JSX que el padre ya renderiza hoy (grid + paginación crawleable).
     *  Se muestra tal cual hasta que el usuario cambie algún filtro; a partir
     *  de ahí este componente pasa a modo interactivo y no vuelve atrás. Sin
     *  esta prop (caso /search), el componente es siempre interactivo. */
    staticFallback?: React.ReactNode;

    showHeader?: boolean;
    withContainer?: boolean;
}

export default function GameExplorer({
    initialGames,
    initialTotal,
    pageSize = 24,
    defaultOrdering,
    lockedPlatform,
    selectedPlatformIds,
    onPlatformFilterChange,
    showSearchInput = false,
    query = '',
    staticFallback,
    showHeader = false,
    withContainer = false,
}: Props) {
    const { conditionParam, sellerScopeParam, ready } = useApp();
    /* Un filtro global activo saca a la landing del modo estático aunque nadie
       haya tocado su sidebar: el `staticFallback` que sirvió el servidor no
       conoce localStorage, así que mostrarlo sin filtrar contradice al navbar.
       Sin esto, cambiar el formato desde una landing no hacía nada visible. */
    const globalFiltersActive = !!conditionParam || !!sellerScopeParam;
    const { isAdmin } = useAdmin();
    const { ready: consentReady } = useConsent();

    const isStaticMode = !!staticFallback;
    const [interactive, setInteractive] = useState(!isStaticMode);
    const markInteractive = useCallback(() => {
        if (isStaticMode) setInteractive(true);
    }, [isStaticMode]);

    const [games, setGames] = useState<Game[]>(initialGames);
    const [facets, setFacets] = useState<GameFacets>({ platforms: {}, genres: {}, sellers: {} });
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(initialGames.length === 0);
    const [searchInput, setSearchInput] = useState(query);
    const [activeQuery, setActiveQuery] = useState(query);
    const [ordering, setOrdering] = useState<string>(defaultOrdering);

    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);

    const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
    const [priceMin, setPriceMin] = useState<number | undefined>(undefined);
    const [priceMax, setPriceMax] = useState<number | undefined>(undefined);
    const [priceMinInput, setPriceMinInput] = useState<string | number>('');
    const [priceMaxInput, setPriceMaxInput] = useState<string | number>('');
    const [onSale, setOnSale] = useState(false);

    const [filtersOpen, setFiltersOpen] = useState(false);

    /* ── Selección/fusión admin ── */
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState<{ id: number; name: string }[]>([]);
    const [targetId, setTargetId] = useState<number | null>(null);
    const [merging, setMerging] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const effectivePlatformIds = lockedPlatform ? [lockedPlatform.id] : selectedPlatformIds ?? [];

    const platformSlugFor = (game: Game) => {
        if (lockedPlatform) return lockedPlatform.slug;
        if (effectivePlatformIds.length === 0) return undefined;
        return game.platforms.find((p) => effectivePlatformIds.includes(p.id))?.slug;
    };

    const togglePlatform = (id: number) => {
        if (lockedPlatform) return;
        const next = effectivePlatformIds.includes(id)
            ? effectivePlatformIds.filter((x) => x !== id)
            : [...effectivePlatformIds, id];
        onPlatformFilterChange?.(next);
        markInteractive();
        setPage(1);
    };

    const clearPlatforms = () => {
        if (lockedPlatform) return;
        onPlatformFilterChange?.([]);
        markInteractive();
        setPage(1);
    };

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
            setTargetId((t) => t ?? id);
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
            setRefreshKey((k) => k + 1);
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

    /* Fetch de opciones de filtro. La plataforma nunca hace falta cuando está
       fija: no hay selector que poblar. */
    useEffect(() => {
        if (!lockedPlatform) {
            getPlatforms()
                .then((res) => setPlatforms(res.results))
                .catch(() => { });
        }
        getGenres()
            .then((res) => setGenres(res.results))
            .catch(() => { });
    }, [lockedPlatform]);

    useEffect(() => {
        setActiveQuery(query);
        setSearchInput(query);
        setPage(1);
    }, [query]);

    /* ── Popularity tracking de la selección de consola ──
       No aplica cuando la plataforma está fija: no hay selector con el que
       interactuar. */
    const trackedPlatforms = useRef<Set<number>>(new Set());
    const seededPlatforms = useRef(false);
    useEffect(() => {
        if (lockedPlatform) return;
        if (!consentReady) return;
        if (!seededPlatforms.current) {
            if (platforms.length === 0) return;
            seededPlatforms.current = true;
            for (const id of effectivePlatformIds) trackedPlatforms.current.add(id);
            return;
        }
        for (const id of effectivePlatformIds) {
            if (!trackedPlatforms.current.has(id)) {
                trackedPlatforms.current.add(id);
                trackEvent({ event_type: 'platform_select', platform: id });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectivePlatformIds.join(','), platforms, consentReady, lockedPlatform]);

    const trackedSearch = useRef<string | null>(null);

    useEffect(() => {
        // En modo estático (landing sin interactuar) no se toca la red: el
        // HTML que ya sirvió el servidor es el contenido real.
        if (isStaticMode && !interactive && !globalFiltersActive) return;
        if (!ready) return;
        const controller = new AbortController();
        setLoading(true);
        getGames({
            search: activeQuery || undefined,
            platforms: effectivePlatformIds.length > 0 ? effectivePlatformIds : undefined,
            genres: selectedGenre ?? undefined,
            condition: conditionParam,
            price_min: priceMin,
            price_max: priceMax,
            on_sale: onSale || undefined,
            seller_scope: sellerScopeParam,
            ordering,
            page,
            signal: controller.signal,
        })
            .then((res) => {
                setGames(res.results);
                setTotal(res.count);
                const query = activeQuery.trim();
                if (query && trackedSearch.current !== query) {
                    trackedSearch.current = query;
                    trackEvent({ event_type: 'search', search_query: query, result_count: res.count });
                }
            })
            .catch((err) => {
                if (err?.name === 'AbortError') return;
                setGames([]);
                const failed = activeQuery.trim();
                if (failed && trackedSearch.current !== failed) {
                    trackedSearch.current = failed;
                    trackEvent({ event_type: 'search', search_query: failed });
                }
            })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStaticMode, interactive, globalFiltersActive, ready, activeQuery, ordering, page, effectivePlatformIds.join(','), selectedGenre, conditionParam, priceMin, priceMax, onSale, sellerScopeParam, refreshKey]);

    /* Los contadores del sidebar sí corren en modo estático: solo decoran el
       sidebar, nunca reemplazan el grid/paginación visibles. */
    useEffect(() => {
        if (!ready) return;
        const controller = new AbortController();
        getGameFacets({
            search: activeQuery || undefined,
            platforms: effectivePlatformIds.length > 0 ? effectivePlatformIds : undefined,
            genres: selectedGenre ?? undefined,
            condition: conditionParam,
            price_min: priceMin,
            price_max: priceMax,
            on_sale: onSale || undefined,
            seller_scope: sellerScopeParam,
            signal: controller.signal,
        })
            .then(setFacets)
            .catch((err) => { if (err?.name !== 'AbortError') setFacets({ platforms: {}, genres: {}, sellers: {} }); });
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, activeQuery, effectivePlatformIds.join(','), selectedGenre, conditionParam, priceMin, priceMax, onSale, sellerScopeParam]);

    const totalPages = Math.ceil(total / pageSize);

    const handleSearchSubmit = () => {
        markInteractive();
        setActiveQuery(searchInput);
        setPage(1);
    };

    const handleClearFilters = () => {
        if (!lockedPlatform) onPlatformFilterChange?.([]);
        setSelectedGenre(null);
        setPriceMin(undefined);
        setPriceMax(undefined);
        setPriceMinInput('');
        setPriceMaxInput('');
        setOnSale(false);
        markInteractive();
        setPage(1);
    };

    const applyPriceMin = () => {
        markInteractive();
        setPriceMin(typeof priceMinInput === 'number' ? priceMinInput : undefined);
        setPage(1);
    };

    const applyPriceMax = () => {
        markInteractive();
        setPriceMax(typeof priceMaxInput === 'number' ? priceMaxInput : undefined);
        setPage(1);
    };

    const handleSelectGenre = (id: number | null) => {
        markInteractive();
        setSelectedGenre(id);
        setPage(1);
    };

    const handleToggleOnSale = () => {
        markInteractive();
        setOnSale((v) => !v);
        setPage(1);
    };

    const handleOrderingChange = (v: string) => {
        markInteractive();
        setOrdering(v);
        setPage(1);
    };

    const handlePageChange = (p: number) => {
        markInteractive();
        setPage(p);
    };

    const hasActiveFilters =
        (effectivePlatformIds.length > 0 && !lockedPlatform) ||
        selectedGenre !== null ||
        priceMin !== undefined ||
        priceMax !== undefined ||
        onSale;

    const content = (
        <>
            {showHeader && (
                <Box mb="xl">
                    <Title order={1} fz={{ base: 28, md: 36 }} fw={700} mb="xs">
                        {activeQuery ? `Resultados para "${activeQuery}"` : 'Explorar Juegos'}
                    </Title>
                    <Text c="dimmed">
                        {total} juego{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                    </Text>
                </Box>
            )}

            <FilterToolbar
                showSearchInput={showSearchInput}
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onSearchSubmit={handleSearchSubmit}
                ordering={ordering}
                defaultOrdering={defaultOrdering}
                onOrderingChange={handleOrderingChange}
                selectionMode={selectionMode}
                onToggleSelectionMode={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                hasActiveFilters={hasActiveFilters}
                filtersOpen={filtersOpen}
                onToggleFiltersOpen={() => setFiltersOpen((o) => !o)}
            />

            {/* Mobile filters collapse */}
            <Box hiddenFrom="md" mb="lg">
                <Collapse in={filtersOpen}>
                    <Paper
                        withBorder
                        radius="lg"
                        p="lg"
                        style={{
                            borderColor: hasActiveFilters ? 'var(--mantine-color-primaryRed-5)' : undefined,
                        }}
                    >
                        <GameFilterBar
                            priceMinInput={priceMinInput}
                            priceMaxInput={priceMaxInput}
                            onPriceMinInputChange={setPriceMinInput}
                            onPriceMaxInputChange={setPriceMaxInput}
                            onApplyPriceMin={applyPriceMin}
                            onApplyPriceMax={applyPriceMax}
                            showPlatformSection={!lockedPlatform}
                            platforms={platforms}
                            selectedPlatforms={effectivePlatformIds}
                            onTogglePlatform={togglePlatform}
                            onClearPlatforms={clearPlatforms}
                            genres={genres}
                            selectedGenre={selectedGenre}
                            onSelectGenre={handleSelectGenre}
                            onSale={onSale}
                            onToggleOnSale={handleToggleOnSale}
                            facets={facets}
                            hasActiveFilters={hasActiveFilters}
                            onClearFilters={handleClearFilters}
                        />
                    </Paper>
                </Collapse>
            </Box>

            {/* Two-column layout: sidebar + results */}
            <Box style={{ display: 'flex', gap: 'var(--mantine-spacing-xl)', alignItems: 'flex-start' }}>
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
                        borderColor: hasActiveFilters ? 'var(--mantine-color-primaryRed-5)' : undefined,
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
                        <GameFilterBar
                            priceMinInput={priceMinInput}
                            priceMaxInput={priceMaxInput}
                            onPriceMinInputChange={setPriceMinInput}
                            onPriceMaxInputChange={setPriceMaxInput}
                            onApplyPriceMin={applyPriceMin}
                            onApplyPriceMax={applyPriceMax}
                            showPlatformSection={!lockedPlatform}
                            platforms={platforms}
                            selectedPlatforms={effectivePlatformIds}
                            onTogglePlatform={togglePlatform}
                            onClearPlatforms={clearPlatforms}
                            genres={genres}
                            selectedGenre={selectedGenre}
                            onSelectGenre={handleSelectGenre}
                            onSale={onSale}
                            onToggleOnSale={handleToggleOnSale}
                            facets={facets}
                            hasActiveFilters={hasActiveFilters}
                            onClearFilters={handleClearFilters}
                        />
                    </ScrollArea>
                </Paper>

                {/* data-prefs-dependent: el grid que sirvió el servidor NO está
                    filtrado (es ISR y lo comparten todos los visitantes), así
                    que hasta que React hidrata con las preferencias reales el
                    CSS lo tapa para quien se desvía del default. Cubre a la vez
                    /search y las dos rutas de landing. */}
                <Box style={{ flex: 1, minWidth: 0 }} data-prefs-dependent>
                    {/* La MISMA condición que corta el fetch, o se gastaría la
                        petición para luego seguir pintando el HTML estático. */}
                    {isStaticMode && !interactive && !globalFiltersActive ? staticFallback : (
                        <GameResultsGrid
                            games={games}
                            loading={loading}
                            page={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            platformSlugFor={platformSlugFor}
                            selectionMode={selectionMode}
                            selected={selected}
                            onToggleSelect={toggleSelect}
                        />
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
        </>
    );

    return withContainer ? <Container size="xl" py="xl">{content}</Container> : content;
}
