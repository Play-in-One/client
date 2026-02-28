'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
} from '@mantine/core';
import { IconSearch, IconFilter } from '@tabler/icons-react';
import { getGames } from '@/lib/api';
import type { Game } from '@/lib/types';
import GameCard from '@/components/GameCard';

function SearchContent() {
    const params = useSearchParams();
    const q = params.get('q') ?? '';
    const [games, setGames] = useState<Game[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(q);
    const [activeQuery, setActiveQuery] = useState(q);
    const [ordering, setOrdering] = useState<string>('name');

    useEffect(() => {
        setActiveQuery(q);
        setSearchInput(q);
        setPage(1);
    }, [q]);

    useEffect(() => {
        setLoading(true);
        getGames({ search: activeQuery || undefined, ordering, page })
            .then((res) => {
                setGames(res.results);
                setTotal(res.count);
            })
            .catch(() => setGames([]))
            .finally(() => setLoading(false));
    }, [activeQuery, ordering, page]);

    const totalPages = Math.ceil(total / 50);

    const handleLocalSearch = () => {
        setActiveQuery(searchInput);
        setPage(1);
    };

    return (
        <Container size="lg" py="xl">
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
                    ]}
                    value={ordering}
                    onChange={(v) => { setOrdering(v ?? 'name'); setPage(1); }}
                    size="sm"
                    radius="md"
                    w={180}
                    leftSection={<IconFilter size={16} />}
                />
            </Group>

            {/* Results */}
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
                    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="lg">
                        {games.map((g) => {
                            const best = g.products?.[0] ?? null;
                            return <GameCard key={g.id} game={g} bestProduct={best} />;
                        })}
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
        </Container>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<Container py="xl"><Loader color="primaryRed" /></Container>}>
            <SearchContent />
        </Suspense>
    );
}
