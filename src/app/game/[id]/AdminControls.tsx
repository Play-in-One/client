'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebouncedValue } from '@mantine/hooks';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Card,
    Divider,
    Group,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { Game, Platform, Product } from '@/lib/types';
import {
    addProductPrice,
    getGames,
    getPlatforms,
    mergeGames,
    updateGame,
    updateProduct,
} from '@/lib/api';

const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'used', label: 'Usado' },
    { value: 'digital', label: 'Digital' },
];

/* ── Buscador de juegos reutilizable (reasignar / fusionar) ── */
function GameSearchPicker({
    excludeId,
    onPick,
    placeholder,
}: {
    excludeId: number;
    onPick: (game: { id: number; name: string }) => void;
    placeholder?: string;
}) {
    const [query, setQuery] = useState('');
    const [debounced] = useDebouncedValue(query, 300);
    const [results, setResults] = useState<Game[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = debounced.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        let active = true;
        setLoading(true);
        getGames({ search: q })
            .then((res) => {
                if (active) setResults(res.results.filter((g) => g.id !== excludeId).slice(0, 6));
            })
            .catch(() => active && setResults([]))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [debounced, excludeId]);

    return (
        <Stack gap={4}>
            <TextInput
                size="xs"
                placeholder={placeholder ?? 'Buscar juego…'}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
            />
            {loading && <Text fz="xs" c="dimmed">Buscando…</Text>}
            {results.map((g) => (
                <Button
                    key={g.id}
                    size="compact-xs"
                    variant="light"
                    justify="flex-start"
                    onClick={() => {
                        onPick({ id: g.id, name: g.name });
                        setQuery('');
                        setResults([]);
                    }}
                >
                    {g.name} <Text component="span" c="dimmed" ml={4}>#{g.id}</Text>
                </Button>
            ))}
        </Stack>
    );
}

/* ── Panel de edición a nivel de JUEGO (nombre, imagen, fusión) ── */
export function AdminGameControls({ game }: { game: Game }) {
    const router = useRouter();
    const [name, setName] = useState(game.name);
    const [image, setImage] = useState(game.image ?? '');
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const run = async (fn: () => Promise<unknown>, successMsg: string) => {
        setBusy(true);
        setError(null);
        setOk(null);
        try {
            await fn();
            setOk(successMsg);
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card withBorder radius="lg" p="lg" bg="light-dark(var(--mantine-color-yellow-0), var(--mantine-color-dark-6))">
            <Group justify="space-between" mb="sm">
                <Title order={4}>Edición de administrador</Title>
                <Badge color="yellow" variant="light">Admin</Badge>
            </Group>

            {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
            {ok && <Alert color="green" variant="light" mb="sm">{ok}</Alert>}

            <Stack gap="md">
                <Group align="flex-end" gap="sm" wrap="nowrap">
                    <TextInput
                        label="Nombre del juego"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        style={{ flex: 1 }}
                    />
                    <Button
                        disabled={busy || name.trim() === game.name}
                        onClick={() => run(() => updateGame(game.id, { name: name.trim() }), 'Nombre actualizado.')}
                    >
                        Guardar
                    </Button>
                </Group>

                <Group align="flex-end" gap="sm" wrap="nowrap">
                    <TextInput
                        label="Imagen del juego (URL)"
                        value={image}
                        onChange={(e) => setImage(e.currentTarget.value)}
                        style={{ flex: 1 }}
                    />
                    <Button
                        disabled={busy || image === (game.image ?? '')}
                        onClick={() => run(() => updateGame(game.id, { image }), 'Imagen actualizada.')}
                    >
                        Guardar
                    </Button>
                </Group>

                <Divider label="Fusionar juegos" labelPosition="left" />
                <Text fz="xs" c="dimmed">
                    Busca juegos duplicados: sus productos se moverán a <b>{game.name}</b> y el
                    duplicado se eliminará.
                </Text>
                <GameSearchPicker
                    excludeId={game.id}
                    placeholder="Buscar juego duplicado…"
                    onPick={(g) =>
                        setSources((prev) => (prev.some((s) => s.id === g.id) ? prev : [...prev, g]))
                    }
                />
                {sources.length > 0 && (
                    <Stack gap={4}>
                        {sources.map((s) => (
                            <Group key={s.id} gap="xs">
                                <Text fz="sm" style={{ flex: 1 }}>{s.name} <Text component="span" c="dimmed">#{s.id}</Text></Text>
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() => setSources((prev) => prev.filter((x) => x.id !== s.id))}
                                >
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Group>
                        ))}
                        <Button
                            color="orange"
                            disabled={busy}
                            onClick={() =>
                                run(
                                    () => mergeGames(game.id, sources.map((s) => s.id)),
                                    `Fusionados ${sources.length} juego(s).`,
                                ).then(() => setSources([]))
                            }
                        >
                            Fusionar {sources.length} en este juego
                        </Button>
                    </Stack>
                )}
            </Stack>
        </Card>
    );
}

/* ── Editor inline de UN producto (precio, consola, link, condición, reasignar) ──
 * Se monta cuando el admin abre el lápiz de una fila. Cachea las plataformas a
 * nivel de módulo para no re-fetch cada vez que se abre un editor. */
let platformCache: Platform[] | null = null;

export function AdminProductEditor({ product }: { product: Product }) {
    const [platforms, setPlatforms] = useState<Platform[]>(platformCache ?? []);
    useEffect(() => {
        if (platformCache) return;
        getPlatforms()
            .then((res) => {
                platformCache = res.results;
                setPlatforms(res.results);
            })
            .catch(() => {});
    }, []);

    return <ProductRow product={product} platforms={platforms} />;
}

function ProductRow({ product, platforms }: { product: Product; platforms: Platform[] }) {
    const router = useRouter();
    const [url, setUrl] = useState(product.url);
    const [platformId, setPlatformId] = useState<string | null>(String(product.platform.id));
    const [condition, setCondition] = useState<string | null>(product.condition);
    const [newPrice, setNewPrice] = useState<number | string>('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const run = async (fn: () => Promise<unknown>, successMsg: string) => {
        setBusy(true);
        setMsg(null);
        try {
            await fn();
            setMsg({ type: 'ok', text: successMsg });
            router.refresh();
        } catch (e) {
            setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Error.' });
        } finally {
            setBusy(false);
        }
    };

    const platformData = platforms.map((pl) => ({ value: String(pl.id), label: pl.display_name }));

    return (
        <Card withBorder radius="md" p="md">
            <Text fw={600} fz="sm" mb="xs">
                {product.seller.name} — <Text component="span" c="dimmed">{product.title}</Text>
            </Text>
            {msg && (
                <Alert color={msg.type === 'ok' ? 'green' : 'red'} variant="light" mb="sm" py={4}>
                    {msg.text}
                </Alert>
            )}
            <Stack gap="sm">
                <Group align="flex-end" gap="sm" wrap="nowrap">
                    <NumberInput
                        label="Nuevo precio"
                        placeholder={product.current_price ?? 'sin precio'}
                        value={newPrice}
                        onChange={setNewPrice}
                        min={0}
                        thousandSeparator="."
                        decimalSeparator=","
                        style={{ flex: 1 }}
                    />
                    <Button
                        disabled={busy || newPrice === '' || newPrice === null}
                        onClick={() =>
                            run(() => addProductPrice(product.id, newPrice), 'Precio agregado.').then(() => setNewPrice(''))
                        }
                    >
                        Agregar precio
                    </Button>
                </Group>

                <Group grow align="flex-end" gap="sm">
                    <Select
                        label="Consola / plataforma"
                        data={platformData}
                        value={platformId}
                        onChange={setPlatformId}
                        searchable
                    />
                    <Select
                        label="Condición"
                        data={CONDITION_OPTIONS}
                        value={condition}
                        onChange={setCondition}
                    />
                </Group>

                <TextInput
                    label="Link del producto"
                    value={url}
                    onChange={(e) => setUrl(e.currentTarget.value)}
                />

                <Group justify="space-between">
                    <Button
                        variant="light"
                        disabled={
                            busy ||
                            (url === product.url &&
                                platformId === String(product.platform.id) &&
                                condition === product.condition)
                        }
                        onClick={() =>
                            run(
                                () =>
                                    updateProduct(product.id, {
                                        url,
                                        platform: platformId ? Number(platformId) : undefined,
                                        condition: (condition as 'new' | 'used' | 'digital') ?? undefined,
                                    }),
                                'Producto actualizado.',
                            )
                        }
                    >
                        Guardar cambios del producto
                    </Button>
                </Group>

                <Divider label="Reasignar a otro juego" labelPosition="left" />
                <GameSearchPicker
                    excludeId={product.game ?? 0}
                    placeholder="Mover este producto a…"
                    onPick={(g) =>
                        run(() => updateProduct(product.id, { game: g.id }), `Movido a "${g.name}".`)
                    }
                />
            </Stack>
        </Card>
    );
}
