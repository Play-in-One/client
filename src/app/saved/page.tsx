'use client';

import Link from 'next/link';
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Box,
    Stack,
    Button,
    ActionIcon,
} from '@mantine/core';
import { IconBookmark, IconX } from '@tabler/icons-react';
import GameCard from '@/components/GameCard';
import { useApp } from '@/context/AppContext';

export default function SavedGamesPage() {
    const { savedGames, removeSaved } = useApp();

    return (
        <Container size="lg" py="xl">
            <Title order={1} fz={{ base: 24, md: 32 }} fw={800} mb="xs">
                Juegos Guardados
            </Title>
            <Text c="dimmed" mb="xl">
                Los juegos que guardes se almacenan solo en este navegador. El precio e imagen mostrados corresponden al momento en que los guardaste.
            </Text>

            {savedGames.length === 0 ? (
                <Stack align="center" py={60} gap="sm">
                    <IconBookmark size={48} color="var(--mantine-color-dimmed)" />
                    <Text fw={600}>Aún no has guardado ningún juego</Text>
                    <Text c="dimmed" fz="sm" ta="center" maw={360}>
                        Toca el ícono de marcador en cualquier juego para guardarlo aquí.
                    </Text>
                    <Button component={Link} href="/search" variant="light" mt="sm">
                        Explorar juegos
                    </Button>
                </Stack>
            ) : (
                <SimpleGrid cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', xs: 'lg' }}>
                    {savedGames.map((sg) => (
                        <Box key={sg.id} pos="relative">
                            <ActionIcon
                                variant="filled"
                                color="dark"
                                size="sm"
                                radius="xl"
                                pos="absolute"
                                top={12}
                                right={12}
                                style={{ zIndex: 3 }}
                                aria-label="Quitar de guardados"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeSaved(sg.id);
                                }}
                            >
                                <IconX size={14} />
                            </ActionIcon>
                            <GameCard
                                game={{
                                    ...sg,
                                    description: null,
                                    developer: '',
                                    release_date: null,
                                    on_sale: false,
                                    rating: null,
                                }}
                            />
                        </Box>
                    ))}
                </SimpleGrid>
            )}
        </Container>
    );
}
