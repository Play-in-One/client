'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Anchor, Badge, Box, Card, Group, SegmentedControl, Select, Text, Title } from '@mantine/core';
import { IconCheck, IconPackage } from '@tabler/icons-react';
import { GAME_FORMATS, consoleQueryString, type ConsoleConfiguration, type ConsoleQuery } from '@/lib/consoles';
import { formatCLP } from '@/lib/utils';
import { plural } from './ConsoleCard';
import styles from './ConsoleCatalog.module.css';

/* Above this many packs, quick edition/storage filters narrow the tiles. */
const QUICK_FILTER_MIN = 5;

function byPrice(a: ConsoleConfiguration, b: ConsoleConfiguration) {
    if (a.min_price == null || b.min_price == null) return a.min_price == null ? (b.min_price == null ? 0 : 1) : -1;
    return Number(a.min_price) - Number(b.min_price);
}

function PackTile({ href, selected, empty, title, tags = [], onSelect, children, price }: {
    href: string; selected: boolean; empty: boolean; title: string; tags?: string[];
    onSelect: (event: MouseEvent) => void; children?: React.ReactNode; price: React.ReactNode;
}) {
    return (
        <div className={styles.pack} data-selected={selected || undefined} data-empty={empty || undefined} data-console-pack>
            <Group justify="space-between" gap="xs" wrap="nowrap" align="flex-start">
                <Link href={href} className={styles.packLink} aria-current={selected ? 'true' : undefined} onClick={onSelect} scroll={false}>
                    {title}
                </Link>
                {selected && <IconCheck size={18} color="var(--mantine-color-primaryRed-5)" aria-hidden style={{ flexShrink: 0 }} />}
            </Group>
            {tags.length > 0 && <Group gap={4}>{tags.map(tag => <Badge key={tag} size="sm" variant="light" color="gray">{tag}</Badge>)}</Group>}
            {children}
            <div className={styles.packPrice}>{price}</div>
        </div>
    );
}

export function ConsolePackPicker({ configurations, sellerCount, query, basePath, onSelect }: {
    configurations: ConsoleConfiguration[];
    sellerCount: number;
    query: ConsoleQuery;
    basePath: string;
    onSelect: (configuration?: number) => void;
}) {
    const [edition, setEdition] = useState('all');
    const [storage, setStorage] = useState('all');
    const editions = [...new Map(configurations.map(c => [String(c.edition), c.edition_name])).entries()];
    const storages = [...new Map(configurations.map(c => [String(c.storage_gb), c.storage_label])).entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]));
    const quick = configurations.length >= QUICK_FILTER_MIN;
    const visible = configurations
        .filter(c => !quick || ((edition === 'all' || String(c.edition) === edition) && (storage === 'all' || String(c.storage_gb) === storage)))
        .sort(byPrice);
    const priced = configurations.filter(c => c.min_price != null);
    const overall = priced.length ? Math.min(...priced.map(c => Number(c.min_price))) : null;
    const select = (id?: number) => (event: MouseEvent) => { event.preventDefault(); onSelect(id); };
    const href = (id?: number) => `${basePath}${consoleQueryString({ ...query, configuration: id, edition: undefined, storage_gb: undefined, has_game: undefined })}`;

    return (
        <Card radius="xl" p={0} component="section" aria-labelledby="console-packs">
            <div className={styles.sectionHeader}>
                <Group gap="xs">
                    <IconPackage size={22} color="var(--mantine-color-primaryRed-5)" aria-hidden />
                    <Title order={2} id="console-packs" fz="lg" fw={700}>Elige tu pack</Title>
                    <Text fz="sm" c="dimmed">{plural(configurations.length, 'configuración', 'configuraciones')}</Text>
                </Group>
                {quick && (
                    <Group gap="sm" className={styles.quickFilters}>
                        {/* A dropdown: edition names are long ("Ghost of Yōtei Limited Edition")
                            and several of them overflowed a segmented row. */}
                        {editions.length > 1 && <Select size="xs" w={240} maw="100%" value={edition} allowDeselect={false}
                            onChange={value => setEdition(value ?? 'all')} aria-label="Edición" checkIconPosition="right"
                            data={[{ value: 'all', label: 'Todas las ediciones' }, ...editions.map(([value, label]) => ({ value, label }))]}
                            comboboxProps={{ withinPortal: true }} />}
                        {storages.length > 1 && <SegmentedControl size="xs" value={storage} onChange={setStorage} aria-label="Almacenamiento"
                            data={[{ value: 'all', label: 'Toda capacidad' }, ...storages.map(([value, label]) => ({ value, label }))]} />}
                    </Group>
                )}
            </div>
            <Box p="lg">
                <div className={styles.packGrid}>
                    <PackTile href={href(undefined)} selected={query.configuration === undefined} empty={overall === null}
                        title="Todos los packs" onSelect={select(undefined)}
                        price={overall !== null
                            ? <Text fz="sm"><Text span fz="xs" c="dimmed">Desde </Text><Text span fw={800} className={styles.price}>{formatCLP(overall)}</Text></Text>
                            : <Text fz="sm" c="dimmed">Sin ofertas</Text>}>
                        <Text fz="sm" c="dimmed">Compara todas las ediciones, capacidades y juegos{sellerCount ? ` en ${plural(sellerCount, 'tienda', 'tiendas')}` : ''}.</Text>
                    </PackTile>
                    {visible.map(c => {
                        // Most packs share the edition: the included games are what tells them apart.
                        const title = c.games.length ? c.games.map(game => game.title).join(' + ') : 'Consola sola';
                        const formats = [...new Set(c.games.map(game => game.format).filter(format => format !== 'unknown'))];
                        return (
                            <PackTile key={c.id} href={href(c.id)} selected={query.configuration === c.id} empty={!c.in_stock}
                                title={title} tags={[c.edition_name, c.storage_label, ...formats.map(format => GAME_FORMATS[format])]}
                                onSelect={select(query.configuration === c.id ? undefined : c.id)}
                                price={c.min_price != null
                                    ? <Text fz="sm"><Text span fz="xs" c="dimmed">Desde </Text><Text span fw={800} className={styles.price}>{formatCLP(c.min_price)}</Text>
                                        <Text span fz="xs" c="dimmed"> · {plural(c.seller_count ?? 0, 'tienda', 'tiendas')}</Text></Text>
                                    : <Text fz="sm" c="dimmed">Sin ofertas vigentes</Text>}>
                                {c.games.some(game => game.game) && (
                                    <Group gap={8} className={styles.packGame}>
                                        {c.games.filter(game => game.game).map((game, i) => (
                                            <Anchor key={i} component={Link} href={`/juego/${game.game}`} fz="xs">Ver {game.title}</Anchor>
                                        ))}
                                    </Group>
                                )}
                            </PackTile>
                        );
                    })}
                </div>
                {quick && visible.length === 0 && <Text fz="sm" c="dimmed" mt="md">Ningún pack combina esa edición y capacidad.</Text>}
            </Box>
        </Card>
    );
}
