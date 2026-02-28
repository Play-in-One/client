'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Box,
    Loader,
    Stack,
    Group,
    Badge,
} from '@mantine/core';
import { IconDeviceGamepad } from '@tabler/icons-react';
import { getGames, getPlatforms } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import GameCard from '@/components/GameCard';

const PLATFORM_LABELS: Record<string, string> = {
    ps5: 'PlayStation 5',
    ps4: 'PlayStation 4',
    xbox: 'Xbox',
    switch: 'Nintendo Switch',
    switch2: 'Nintendo Switch 2',
    pc: 'PC / Steam',
};

export default function PlatformPage() {
    const { slug } = useParams<{ slug: string }>();
    const [games, setGames] = useState<Game[]>([]);
    const [platform, setPlatform] = useState<Platform | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;

        setLoading(true);

        // Fetch platform ID, then fetch games filtered by it
        getPlatforms()
            .then((res) => {
                const found = res.results.find((p) => p.slug === slug);
                if (found) {
                    setPlatform(found);
                    return getGames({ platforms: found.id });
                }
                return null;
            })
            .then((res) => {
                if (res) setGames(res.results);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [slug]);

    const label = PLATFORM_LABELS[slug] || slug;

    return (
        <Container size="lg" py="xl">
            <Group mb="xl" gap="md" align="flex-end">
                <Box>
                    <Badge color="primaryRed" variant="light" size="lg" mb="xs">
                        Plataforma
                    </Badge>
                    <Title order={1} fz={{ base: 28, md: 36 }} fw={700}>
                        {label}
                    </Title>
                    <Text c="dimmed" mt={4}>
                        {games.length} juego{games.length !== 1 ? 's' : ''} disponible{games.length !== 1 ? 's' : ''}
                    </Text>
                </Box>
            </Group>

            {loading ? (
                <Stack align="center" py={80}>
                    <Loader color="primaryRed" size="lg" />
                </Stack>
            ) : games.length === 0 ? (
                <Stack align="center" py={80}>
                    <IconDeviceGamepad size={48} color="var(--mantine-color-dimmed)" />
                    <Text fw={600} fz="lg">No hay juegos para esta plataforma</Text>
                    <Text c="dimmed">Pronto agregaremos más títulos</Text>
                </Stack>
            ) : (
                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="lg">
                    {games.map((g) => {
                        const best = g.products?.[0] ?? null;
                        return <GameCard key={g.id} game={g} bestProduct={best} />;
                    })}
                </SimpleGrid>
            )}
        </Container>
    );
}
