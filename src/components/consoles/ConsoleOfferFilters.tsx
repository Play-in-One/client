'use client';

import { Button, Group, SegmentedControl, Select, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { editionSwatch, type ConsoleConfiguration, type ConsoleQuery } from '@/lib/consoles';
import { EditionMark, hasEditionMark } from './EditionMark';
import styles from './ConsoleCatalog.module.css';

/** The query keys the offer filters own; clearing them resets the comparison. */
export const OFFER_FILTER_KEYS = ['edition', 'storage_gb', 'game', 'has_game', 'condition', 'configuration'] as const;

type Option = { value: string; label: string };

/** "Juego incluido" folds three API filters into one choice: no game, any game,
 *  or one specific (catalog-linked) game. */
function gameValue(query: ConsoleQuery): string {
    if (query.game !== undefined) return `g:${query.game}`;
    if (query.has_game !== undefined) return query.has_game ? 'with' : 'none';
    return 'any';
}

function gamePatch(value: string | null): ConsoleQuery {
    if (value?.startsWith('g:')) return { game: Number(value.slice(2)), has_game: undefined };
    if (value === 'with' || value === 'none') return { has_game: value === 'with', game: undefined };
    return { has_game: undefined, game: undefined };
}

/** Filters of the offers of one console model. The options come from the
 *  model's configurations; a dimension with a single value has no control. */
export function ConsoleOfferFilters({ configurations, query, globalCondition, onChange }: {
    configurations: ConsoleConfiguration[];
    query: ConsoleQuery;
    globalCondition: string;
    onChange: (patch: ConsoleQuery) => void;
}) {
    const editionKeys = new Map(configurations.map(c => [String(c.edition), c.edition_key]));
    // Estándar first, then the colours, then the special editions.
    const editionRank = (value: string) => editionKeys.get(value) === 'standard' ? 0 : editionSwatch(editionKeys.get(value)) ? 1 : 2;
    const editions: Option[] = [...new Map(configurations.map(c => [String(c.edition), c.edition_name])).entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => editionRank(a.value) - editionRank(b.value) || a.label.localeCompare(b.label, 'es'));
    const selectedEdition = query.edition ? String(query.edition) : 'all';
    const storages: Option[] = [...new Map(configurations.map(c => [String(c.storage_gb), c.storage_label])).entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0])).map(([value, label]) => ({ value, label }));
    const games: Option[] = [...new Map(configurations.flatMap(c => c.games)
        .filter(game => game.game !== null).map(game => [String(game.game), game.title])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([value, label]) => ({ value: `g:${value}`, label }));
    const withGame = configurations.some(c => c.games.length > 0);
    const withoutGame = configurations.some(c => c.games.length === 0);
    const gameOptions: Option[] = [{ value: 'any', label: 'Todos' },
        ...(withoutGame && withGame ? [{ value: 'none', label: 'Sin juego' }, { value: 'with', label: 'Con algún juego' }] : []),
        ...games];
    const active = OFFER_FILTER_KEYS.some(key => query[key] !== undefined);

    return (
        <div className={styles.offerFilters} role="group" aria-label="Filtros de ofertas" data-console-offer-filters>
            {editions.length > 1 && (
                // Colour is an edition («Neón», «Coral»): its option shows the colour; a special edition, its icon.
                <Select size="xs" label="Edición o color" w={230} maw="100%" allowDeselect={false} checkIconPosition="right"
                    data={[{ value: 'all', label: 'Todas' }, ...editions]} value={selectedEdition}
                    leftSection={hasEditionMark(editionKeys.get(selectedEdition)) ? <EditionMark editionKey={editionKeys.get(selectedEdition)} /> : undefined}
                    renderOption={({ option }) => (
                        <Group gap={8} wrap="nowrap"><EditionMark editionKey={editionKeys.get(option.value)} /><span>{option.label}</span></Group>
                    )}
                    onChange={value => onChange({ edition: value && value !== 'all' ? Number(value) : undefined })}
                    comboboxProps={{ withinPortal: true }} />
            )}
            {storages.length > 1 && (
                <Select size="xs" label="Capacidad" w={150} allowDeselect={false} checkIconPosition="right"
                    data={[{ value: 'all', label: 'Todas' }, ...storages]} value={query.storage_gb ? String(query.storage_gb) : 'all'}
                    onChange={value => onChange({ storage_gb: value && value !== 'all' ? Number(value) : undefined })}
                    comboboxProps={{ withinPortal: true }} />
            )}
            {gameOptions.length > 1 && (
                <Select size="xs" label="Juego incluido" w={220} maw="100%" allowDeselect={false} checkIconPosition="right"
                    data={gameOptions} value={gameValue(query)} onChange={value => onChange(gamePatch(value))}
                    comboboxProps={{ withinPortal: true }} />
            )}
            <div className={styles.segmentScroll}>
                <Text component="span" fz="xs" fw={500} display="block" mb={2} aria-hidden>Condición</Text>
                <SegmentedControl size="xs" aria-label="Condición" value={query.condition ?? 'any'}
                    onChange={value => onChange({ condition: value === 'new' || value === 'used' ? value : undefined })}
                    data={[{ value: 'any', label: globalCondition === 'all' ? 'Todas' : 'Según preferencia' },
                        { value: 'new', label: 'Nuevo' }, { value: 'used', label: 'Usado' }]} />
            </div>
            {active && (
                <Group gap={0} align="flex-end" style={{ alignSelf: 'flex-end' }}>
                    <Button size="xs" variant="subtle" color="gray" leftSection={<IconX size={14} />}
                        onClick={() => onChange(Object.fromEntries(OFFER_FILTER_KEYS.map(key => [key, undefined])) as ConsoleQuery)}>
                        Quitar filtros
                    </Button>
                </Group>
            )}
        </div>
    );
}
