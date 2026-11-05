'use client';

import { useCallback, useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import {
    Alert, Anchor, Box, Breadcrumbs, Button, Container, Group, Loader, SegmentedControl, Select, SimpleGrid, Stack, Text,
    TextInput, Title,
} from '@mantine/core';
import { IconChevronRight, IconHome, IconSearch } from '@tabler/icons-react';
import { useApp } from '@/context/AppContext';
import InfoHeading from '@/components/InfoHeading';
import { getConsoles } from '@/lib/api';
import { CONSOLE_FAMILIES, CONSOLE_PLATFORMS, consoleQueryString, type ConsoleModel, type ConsoleQuery } from '@/lib/consoles';
import { FALLBACK_PLATFORM_ICON, PLATFORM_ICONS } from '@/lib/platformIcons';
import type { PaginatedResponse } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/utils';
import { ConsoleCard, ConsoleCardSkeleton, plural } from './ConsoleCard';
import { StaffPreviewNotice } from './StaffOnly';
import { replaceQueryInUrl, useConsoleRequest } from './useConsoleRequest';
import styles from './ConsoleCatalog.module.css';

const GRID_COLS = { base: 1, xs: 2, md: 3, lg: 4 } as const;
const ORDERINGS = [
    { value: 'name', label: 'Nombre' }, { value: 'min_price', label: 'Menor precio' }, { value: '-min_price', label: 'Mayor precio' },
];
/* Filters that narrow the catalog; `seller` comes from a store page link and
   `page`/`ordering` do not hide anything. */
const NARROWING = ['search', 'platform', 'storage_gb', 'has_game', 'condition', 'edition', 'configuration'] as const;

function clean(query: ConsoleQuery): ConsoleQuery {
    return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== '')) as ConsoleQuery;
}

export function ConsoleCatalogSkeleton() {
    return (
        <Container size="xl" py="xl" aria-busy>
            <Stack gap="lg">
                <Box h={40} />
                <SimpleGrid cols={GRID_COLS} spacing="lg">
                    {Array.from({ length: 8 }, (_, i) => <ConsoleCardSkeleton key={i} />)}
                </SimpleGrid>
            </Stack>
        </Container>
    );
}

function PlatformLinks({ query, onSelect }: { query: ConsoleQuery; onSelect: (platform?: string) => void }) {
    const link = (platform?: string) => ({
        component: Link, href: `/consolas${consoleQueryString(clean({ ...query, platform, page: undefined }))}`,
        onClick: (event: MouseEvent) => { event.preventDefault(); onSelect(platform); },
    });
    return (
        // Centred under the search line, as wide as its options (it scrolls on phones).
        <div className={styles.centerRow}>
        <nav className={`${styles.platformRow} ${styles.fitRow}`} aria-label="Plataforma">
            <Button size="sm" radius="sm" variant={!query.platform ? 'filled' : 'subtle'} color={!query.platform ? 'primaryRed' : 'gray'}
                aria-current={!query.platform ? 'page' : undefined} {...link(undefined)}>Todas</Button>
            {CONSOLE_PLATFORMS.map(([slug, label]) => {
                const Icon = PLATFORM_ICONS[slug] || FALLBACK_PLATFORM_ICON;
                const active = query.platform === slug;
                return (
                    <Button key={slug} size="sm" radius="sm" variant={active ? 'filled' : 'subtle'}
                        color={active ? PLATFORM_COLORS[slug]?.mantine ?? 'gray' : 'gray'} leftSection={<Icon size={18} />}
                        aria-current={active ? 'page' : undefined} {...link(slug)}>{label}</Button>
                );
            })}
        </nav>
        </div>
    );
}

export function ConsoleCatalog({ initialData, initialQuery = {}, preview = false }: {
    initialData: PaginatedResponse<ConsoleModel> | null;
    initialQuery?: ConsoleQuery;
    /** Staff preview: loads with the admin token and shows drafts. */
    preview?: boolean;
}) {
    const { condition: globalCondition } = useApp();
    const [query, setQuery] = useState(initialQuery);
    const [search, setSearch] = useState(initialQuery.search ?? '');
    const load = useCallback((q: ConsoleQuery, signal: AbortSignal) => getConsoles(q, { signal, admin: preview }), [preview]);
    const { data, error, busy, stale, retry } = useConsoleRequest(initialData, query, load);

    // The URL is written outside the state updater: Next's router listens to
    // history changes, and updating it while React renders is an error.
    const update = useCallback((patch: ConsoleQuery) => {
        const next = clean({ ...query, ...patch, page: undefined });
        setQuery(next);
        replaceQueryInUrl(consoleQueryString(next));
    }, [query]);

    // Search as you type, without a request per keystroke.
    useEffect(() => {
        const value = search.trim() || undefined;
        if (value === query.search) return;
        const timer = window.setTimeout(() => update({ search: value }), 350);
        return () => window.clearTimeout(timer);
    }, [search, query.search, update]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        update({ search: search.trim() || undefined });
    };

    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 24;
    const filtered = NARROWING.some(key => query[key] !== undefined);
    const results = data?.results ?? [];
    const grouped = !query.platform && !query.search && (query.ordering ?? 'name') === 'name';
    const families = CONSOLE_FAMILIES
        .map(({ family, label }) => ({ family, label, models: results.filter(model => model.platform.family === family) }))
        .filter(group => group.models.length > 0);
    const ungrouped = results.filter(model => !CONSOLE_FAMILIES.some(({ family }) => family === model.platform.family));
    const published = results.filter(model => model.is_published !== false).length;

    return (
        <Container size="xl" py="xl" data-ui>
            <Breadcrumbs separator={<IconChevronRight size={14} color="var(--mantine-color-dimmed)" />} mb="lg" fz="sm">
                <Anchor component={Link} href="/" c="dimmed" underline="never"><Group gap="2xs"><IconHome size={14} /> Inicio</Group></Anchor>
                <Text fw={500} fz="sm">Consolas</Text>
            </Breadcrumbs>

            {preview && data && (
                <StaffPreviewNotice>
                    Solo los administradores ven esta página. {published} de {plural(results.length, 'modelo', 'modelos')} en
                    esta vista {published === 1 ? 'está publicado' : 'están publicados'}; los borradores no aparecen al público.
                </StaffPreviewNotice>
            )}

            <Stack gap={6} mb="lg">
                <InfoHeading label="Cómo comparamos consolas" heading={<Title order={1} fz={{ base: 28, md: 36 }} fw={800}>Consolas</Title>}>
                    <Text fz="sm" c="dimmed" maw={680}>
                        Cada modelo reúne sus ediciones, capacidades y packs con juego. El precio «desde» es la oferta más
                        barata con stock, con el envío promedio de la tienda y los cupones vigentes ya sumados.
                    </Text>
                </InfoHeading>
                <Text c="dimmed">Compara modelos, packs y tiendas. Precios con envío y cupones incluidos.</Text>
            </Stack>

            <Stack gap="md" mb="xl">
                <form className={styles.toolbar} role="search" action="/consolas" onSubmit={submit} aria-label="Filtros de consolas">
                    <TextInput className={styles.toolbarSearch} name="search" type="search" label="Buscar consola"
                        placeholder="Modelo, por ejemplo «Switch OLED»" value={search} onChange={event => setSearch(event.currentTarget.value)}
                        leftSection={<IconSearch size={16} />} />
                    <Box>
                        <Text component="span" id="console-condition" fz="sm" fw={500} display="block" mb={4}>Condición</Text>
                        <SegmentedControl aria-labelledby="console-condition" value={query.condition ?? 'any'}
                            onChange={value => update({ condition: value === 'any' ? undefined : value as 'new' | 'used' })}
                            data={[{ value: 'any', label: globalCondition === 'all' ? 'Todas' : 'Según preferencia' },
                                { value: 'new', label: 'Nuevo' }, { value: 'used', label: 'Usado' }]} />
                    </Box>
                    <Box>
                        <Text component="span" id="console-has-game" fz="sm" fw={500} display="block" mb={4}>Juego incluido</Text>
                        <SegmentedControl aria-labelledby="console-has-game"
                            value={query.has_game === undefined ? 'any' : String(query.has_game)}
                            onChange={value => update({ has_game: value === 'any' ? undefined : value === 'true' })}
                            data={[{ value: 'any', label: 'Todos' }, { value: 'true', label: 'Con juego' }, { value: 'false', label: 'Sin juego' }]} />
                    </Box>
                    <Select label="Ordenar por" w={170} allowDeselect={false} data={ORDERINGS} value={query.ordering ?? 'name'}
                        onChange={value => update({ ordering: value && value !== 'name' ? value : undefined })} />
                </form>
                <PlatformLinks query={query} onSelect={platform => update({ platform })} />
            </Stack>

            {error && (
                <Alert color="danger" title="No pudimos actualizar las ofertas" mb="lg">
                    <Group gap="sm">
                        <Text fz="sm">Inténtalo nuevamente para consultar precios vigentes.</Text>
                        <Button size="xs" variant="light" color="danger" onClick={retry}>Reintentar</Button>
                    </Group>
                </Alert>
            )}

            {/* First load, or a new filter whose results are not these ones yet. */}
            {(!data && busy) || stale ? (
                <SimpleGrid cols={GRID_COLS} spacing="lg" aria-busy>
                    {Array.from({ length: 8 }, (_, i) => <ConsoleCardSkeleton key={i} />)}
                </SimpleGrid>
            ) : results.length > 0 && data ? (
                <Box aria-busy={busy}>
                    <Group gap="xs" mb="md">
                        <Text fz="sm" c="dimmed">{plural(data.count, 'modelo', 'modelos')}</Text>
                        {busy && <Loader size="xs" color="primaryRed" aria-label="Actualizando ofertas" />}
                    </Group>
                    {grouped ? (
                        <Stack gap="xl">
                            {[...families, ...(ungrouped.length ? [{ family: 'other', label: 'Otras', models: ungrouped }] : [])].map(group => (
                                <Box component="section" key={group.family} aria-labelledby={`family-${group.family}`}>
                                    <Title order={2} id={`family-${group.family}`} fz="lg" fw={700} mb="md">{group.label}</Title>
                                    <SimpleGrid cols={GRID_COLS} spacing="lg">
                                        {group.models.map(model => <ConsoleCard key={model.id} model={model} showDraft={preview} />)}
                                    </SimpleGrid>
                                </Box>
                            ))}
                        </Stack>
                    ) : (
                        <SimpleGrid cols={GRID_COLS} spacing="lg">
                            {results.map(model => <ConsoleCard key={model.id} model={model} showDraft={preview} headingOrder={2} />)}
                        </SimpleGrid>
                    )}
                    <Group mt="xl" justify="center">
                        {page > 1 && <Button component={Link} variant="default" href={`/consolas${consoleQueryString({ ...query, page: page - 1 })}`}>Anterior</Button>}
                        {data.count > page * pageSize && <Button component={Link} variant="default" href={`/consolas${consoleQueryString({ ...query, page: page + 1 })}`}>Siguiente</Button>}
                    </Group>
                </Box>
            ) : !busy && !error && (
                <Stack align="center" gap="sm" py={60} ta="center">
                    <Text fw={600}>No hay consolas que coincidan con estos filtros.</Text>
                    {filtered && <Button variant="light" color="primaryRed" onClick={() => { setSearch(''); setQuery({}); replaceQueryInUrl(''); }}>Quitar filtros</Button>}
                </Stack>
            )}
        </Container>
    );
}
