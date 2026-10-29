'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Alert, Anchor, Box, Button, Container, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useApp } from '@/context/AppContext';
import { useOutboundHref } from '@/hooks/useOutboundHref';
import { getConsole, getConsoles } from '@/lib/api';
import { CONSOLE_PLATFORMS, GAME_FORMATS, configurationLabel, consolePath, consoleQueryString } from '@/lib/consoles';
import type { ConsoleDetail, ConsoleModel, ConsoleQuery, ConsoleConfiguration } from '@/lib/consoles';
import type { PaginatedResponse } from '@/lib/types';
import { formatCLP } from '@/lib/utils';
import PriceInfo from '@/components/PriceInfo';
import styles from './ConsoleCatalog.module.css';

function useConsoleRequest<T>(initial: T | null, query: ConsoleQuery, load: (q: ConsoleQuery, signal: AbortSignal) => Promise<T>) {
    const { condition, sellerLocationsParam, ready } = useApp();
    const [data, setData] = useState(initial);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [retry, setRetry] = useState(0);
    const queryKey = JSON.stringify(query);
    useEffect(() => {
        if (!ready) return;
        const controller = new AbortController();
        setBusy(true);
        setError(false);
        const selected = JSON.parse(queryKey) as ConsoleQuery;
        // Hardware always uses the physical condition, regardless of the games' format preference.
        load({ ...selected, condition: selected.condition ?? (condition === 'all' ? undefined : condition),
            seller_locations: sellerLocationsParam ?? selected.seller_locations }, controller.signal)
            .then(result => { if (!controller.signal.aborted) setData(result); })
            .catch(() => { if (!controller.signal.aborted) setError(true); })
            .finally(() => { if (!controller.signal.aborted) setBusy(false); });
        return () => controller.abort();
    }, [queryKey, condition, sellerLocationsParam, ready, load, retry]);
    return { data, error, busy, retry: () => setRetry(value => value + 1) };
}

function Picture({ image, name }: { image?: string | null; name: string }) {
    const [failed, setFailed] = useState(false);
    return <div className={styles.picture}>
        {image && !failed
            // Store images are remote and already resized by the merchant.
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={image} alt={name} loading="lazy" onError={() => setFailed(true)} />
            : <Text c="dimmed" size="sm">Imagen no disponible</Text>}
    </div>;
}

export function ConsoleCards({ models }: { models: ConsoleModel[] }) {
    return <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="xl">
        {models.map(model => <Link className={styles.model} href={consolePath(model)} key={model.id}>
            <Picture image={model.image} name={model.name} />
            <Text size="sm" c="dimmed" mt="md">{model.platform.long_name || model.platform.display_name}</Text>
            <Title order={2} size="h3" mt={4}>{model.name}</Title>
            <Text fw={700} size="xl" mt="xs" className={styles.price}>
                {model.min_price != null ? `Desde ${formatCLP(model.min_price)}` : 'Sin precio disponible'}
            </Text>
            <Text size="sm" c="dimmed">{model.seller_count > 0 ? `${model.seller_count} ${model.seller_count === 1 ? 'tienda' : 'tiendas'}` : 'Sin ofertas con precio vigente'}</Text>
        </Link>)}
    </SimpleGrid>;
}

function Filters({ query, onChange, configurations }: {
    query: ConsoleQuery; onChange: (q: ConsoleQuery) => void; configurations?: ConsoleConfiguration[];
}) {
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const next: ConsoleQuery = { seller: query.seller, ordering: query.ordering };
        for (const field of ['search', 'platform', 'ordering'] as const) {
            const value = form.get(field)?.toString();
            if (value) next[field] = value;
        }
        for (const field of ['edition', 'storage_gb', 'configuration'] as const) {
            const value = form.get(field)?.toString();
            if (value) next[field] = Number(value);
        }
        const hasGame = form.get('has_game')?.toString();
        if (hasGame) next.has_game = hasGame === 'true';
        const condition = form.get('condition')?.toString();
        if (condition === 'new' || condition === 'used') next.condition = condition;
        onChange(next);
        const category = window.location.pathname === '/search' ? { category: 'console' } : {};
        const params = new URLSearchParams(consoleQueryString(next).slice(1));
        Object.entries(category).forEach(([key, value]) => params.set(key, value));
        const encoded = params.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${encoded ? `?${encoded}` : ''}`);
    };
    const editions = [...new Map(configurations?.map(c => [c.edition, c.edition_name])).entries()];
    const storage = [...new Map(configurations?.map(c => [c.storage_gb, c.storage_label])).entries()].sort((a, b) => a[0] - b[0]);
    return <form action={configurations ? undefined : '/consolas'} className={styles.filters} onSubmit={submit} aria-label="Filtros de consolas">
        {!configurations && <>
            <label>Buscar consola<input name="search" type="search" defaultValue={query.search} placeholder="Modelo de consola" /></label>
            <label>Plataforma<select name="platform" defaultValue={query.platform ?? ''}>
                <option value="">Todas</option>{CONSOLE_PLATFORMS.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
            </select></label>
        </>}
        {configurations && <>
            <label className={styles.configurationFilter}>Configuración exacta<select name="configuration" defaultValue={query.configuration ?? ''}>
                <option value="">Todas las configuraciones</option>
                {configurations.map(c => <option key={c.id} value={c.id}>{configurationLabel(c)}</option>)}
            </select></label>
            <label>Edición<select name="edition" defaultValue={query.edition ?? ''}>
                <option value="">Todas</option>{editions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select></label>
        </>}
        <label>Almacenamiento{configurations ? <select name="storage_gb" defaultValue={query.storage_gb ?? ''}>
            <option value="">Todas las capacidades</option>{storage.map(([size, label]) => <option key={size} value={size}>{label}</option>)}
        </select> : <input type="number" min="1" name="storage_gb" defaultValue={query.storage_gb} placeholder="Capacidad en GB" />}</label>
        <label>Juego incluido<select name="has_game" defaultValue={query.has_game === undefined ? '' : String(query.has_game)}>
            <option value="">Todos los packs</option><option value="true">Con juego</option><option value="false">Sin juego</option>
        </select></label>
        <label>Condición<select name="condition" defaultValue={query.condition ?? ''}>
            <option value="">Preferencia general</option><option value="new">Nuevo</option><option value="used">Usado</option>
        </select></label>
        {!configurations && <label>Ordenar<select name="ordering" defaultValue={query.ordering ?? 'name'}>
            <option value="name">Nombre</option><option value="min_price">Menor precio</option><option value="-min_price">Mayor precio</option>
        </select></label>}
        <Button type="submit">Aplicar filtros</Button>
    </form>;
}

export function StoreConsoleCatalog({ seller, initialData }: { seller: number; initialData: PaginatedResponse<ConsoleModel> }) {
    const load = useCallback((q: ConsoleQuery, signal: AbortSignal) => getConsoles(q, { signal }), []);
    const { data, error, busy, retry } = useConsoleRequest(initialData, { seller, page_size: 6 }, load);
    return <Container size="lg" pb="xl" data-ui>
        <Group justify="space-between" mb="lg"><Title order={2}>Consolas en esta tienda</Title>
            <Anchor component={Link} href={`/consolas?seller=${seller}`}>Ver todas ({data?.count ?? 0})</Anchor></Group>
        <RequestState error={error} busy={busy} retry={retry} />
        {data?.results.length ? <ConsoleCards models={data.results} /> : <Text>No hay consolas para tus preferencias.</Text>}
    </Container>;
}

function RequestState({ error, busy, retry }: { error: boolean; busy: boolean; retry: () => void }) {
    if (error) return <Alert color="red" title="No pudimos actualizar las ofertas" mb="lg">
        Inténtalo nuevamente para consultar precios vigentes. <Button onClick={retry} variant="subtle">Reintentar</Button>
    </Alert>;
    return busy ? <Group gap="xs" mb="md" role="status"><Loader size="xs" /><Text size="sm">Actualizando ofertas…</Text></Group> : null;
}

export function ConsoleCatalog({ initialData, initialQuery = {} }: {
    initialData: PaginatedResponse<ConsoleModel> | null; initialQuery?: ConsoleQuery;
}) {
    const [query, setQuery] = useState(initialQuery);
    const load = useCallback((q: ConsoleQuery, signal: AbortSignal) => getConsoles(q, { signal }), []);
    const { data, error, busy, retry } = useConsoleRequest(initialData, query, load);
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 24;
    return <Container size="lg" py="xl" data-ui>
        <Group gap="lg" mb="lg"><Anchor component={Link} href="/search">Juegos</Anchor><Text fw={700}>Consolas</Text></Group>
        <Title order={1}>Consolas</Title>
        <Text c="dimmed" mt="xs">Compara modelos, capacidades y packs entre tiendas. Precios con envío y cupones aplicables.</Text>
        <Filters query={query} onChange={setQuery} />
        <RequestState error={error} busy={busy} retry={retry} />
        <Box aria-busy={busy}>
            {data && data.results.length > 0 ? <>
                <Text mb="lg" size="sm">{data.count} {data.count === 1 ? 'modelo' : 'modelos'}</Text>
                <ConsoleCards models={data.results} />
                <Group mt="xl" justify="center">
                    {page > 1 && <Anchor component={Link} href={`/consolas${consoleQueryString({ ...query, page: page - 1 })}`}>Anterior</Anchor>}
                    {data.count > page * pageSize && <Anchor component={Link} href={`/consolas${consoleQueryString({ ...query, page: page + 1 })}`}>Siguiente</Anchor>}
                </Group>
            </> : !busy && !error && <Text py="xl">No hay consolas que coincidan con estos filtros.</Text>}
        </Box>
    </Container>;
}

export function ConsoleDetailBrowser({ initialData, initialQuery = {} }: { initialData: ConsoleDetail; initialQuery?: ConsoleQuery }) {
    const [query, setQuery] = useState(initialQuery);
    const load = useCallback((q: ConsoleQuery, signal: AbortSignal) => getConsole(initialData.id, q, { signal }), [initialData.id]);
    const { data, error, busy, retry } = useConsoleRequest(initialData, query, load);
    const outgoingHref = useOutboundHref();
    const model = data ?? initialData;
    const configurations = new Map(model.configurations.map(c => [c.id, c]));
    return <Container size="lg" py="xl" data-ui>
        <Anchor component={Link} href="/consolas">Todas las consolas</Anchor>
        <div className={styles.hero} style={{ marginTop: 24 }}>
            <Picture image={model.image || model.products.find(p => p.image)?.image} name={model.name} />
            <Stack gap="md" align="flex-start">
                <Title order={1}>{model.name}</Title>
                <Text>{model.platform.long_name || model.platform.display_name}</Text>
                {model.description && <Text style={{ whiteSpace: 'pre-line' }}>{model.description}</Text>}
                <Text size="xl" fw={700} className={styles.price} data-console-minimum>
                    {model.min_price != null ? `Desde ${formatCLP(model.min_price)}` : 'Sin precio disponible'}
                </Text>
                <Text size="sm" c="dimmed">{model.seller_count} {model.seller_count === 1 ? 'tienda con precio vigente' : 'tiendas con precio vigente'}. El precio depende de la configuración y condición.</Text>
            </Stack>
        </div>
        <Box mt="xl">
            <Title order={2} size="h3">Compara las ofertas</Title>
            <Filters query={query} onChange={setQuery} configurations={model.configurations} />
            <RequestState error={error} busy={busy} retry={retry} />
            <Stack gap={0} aria-busy={busy}>
                {model.products.map(product => {
                    const configuration = configurations.get(product.configuration ?? 0);
                    return <article className={styles.offer} key={product.id} data-stock={String(product.in_stock)} data-console-offer>
                        <Group justify="space-between" align="flex-start" gap="lg">
                            <Stack gap={6} style={{ flex: '1 1 260px', minWidth: 0 }}>
                                <Anchor component={Link} href={`/store/${product.seller.id}`} fw={700}>{product.seller.name}</Anchor>
                                <Text fw={500}>{configuration ? configurationLabel(configuration) : product.title}</Text>
                                <Text size="sm" c="dimmed">{product.condition === 'used' ? 'Usado' : 'Nuevo'}{!product.in_stock ? ' · Sin stock' : ''}</Text>
                                {configuration?.games.map((game, i) => <Text key={i} size="sm">
                                    {game.game ? <Anchor component={Link} href={`/juego/${game.game}`}>{game.title}</Anchor> : game.title} · {GAME_FORMATS[game.format]}
                                </Text>)}
                            </Stack>
                            <Stack gap="sm" align="flex-end">
                                <Group gap={6}><Text fw={700} size="xl" className={styles.price}>
                                    {product.current_price != null && Number(product.current_price) > 0 ? formatCLP(product.current_price) : 'Sin precio'}
                                </Text><PriceInfo basePrice={product.base_price} shippingCost={product.shipping_cost} seller={product.seller} /></Group>
                                {product.in_stock && product.current_price != null && Number(product.current_price) > 0
                                    ? <Button component="a" href={outgoingHref('product', product.id)} target="_blank" rel="noopener noreferrer sponsored">Ver en tienda</Button>
                                    : <Text size="sm" c="dimmed">{product.in_stock ? 'Precio no informado' : 'Oferta agotada'}</Text>}
                            </Stack>
                        </Group>
                    </article>;
                })}
                {model.products.length === 0 && <Text py="xl">No hay ofertas para esta selección.</Text>}
            </Stack>
        </Box>
    </Container>;
}
