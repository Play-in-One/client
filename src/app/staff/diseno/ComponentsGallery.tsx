'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Box, Code, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { getFeaturedSagas, getGames } from '@/lib/api';
import type { Game, Saga } from '@/lib/types';
import ConditionIcon from '@/components/ConditionIcon';
import CoverChip from '@/components/CoverChip';
import DealConsoleTag from '@/components/DealConsoleTag';
import FeaturedGameCard from '@/components/FeaturedGameCard';
import GameCard from '@/components/GameCard';
import GameGridSkeleton from '@/components/GameGridSkeleton';
import PlatformBadge from '@/components/PlatformBadge';
import RatingPill from '@/components/RatingPill';
import SagaCard from '@/components/SagaCard';

/* Catálogo de los componentes compartidos, pintados con datos reales de la API
   (los primeros juegos y sagas que devuelva) para que se vean como en el sitio.
   Cada pieza lleva el archivo donde vive. */

function Item({ name, file, note, children }: { name: string; file: string; note?: string; children: ReactNode }) {
    return (
        <Stack gap="xs">
            <div>
                <Text fw={700}>{name}</Text>
                <Code fz="xs">{file}</Code>
                {note && <Text fz="xs" c="dimmed" mt="2xs">{note}</Text>}
            </div>
            {children}
        </Stack>
    );
}

export default function ComponentsGallery() {
    const [games, setGames] = useState<Game[] | null>(null);
    const [dealGame, setDealGame] = useState<Game | null>(null);
    const [saga, setSaga] = useState<Saga | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.allSettled([getGames(), getGames({ on_sale: 1 }), getFeaturedSagas()]).then(([all, deals, sagas]) => {
            if (cancelled) return;
            if (all.status === 'fulfilled') setGames(all.value.results);
            else setFailed(true);
            if (deals.status === 'fulfilled') setDealGame(deals.value.results[0] ?? null);
            if (sagas.status === 'fulfilled') setSaga(sagas.value.results[0] ?? null);
        });
        return () => { cancelled = true; };
    }, []);

    if (failed) return <Alert color="danger">No se pudieron cargar juegos de la API para el catálogo.</Alert>;
    if (!games) return <Loader size="sm" />;

    const rated = games.find((g) => g.rating) ?? games[0];
    const withPlatforms = games.find((g) => g.platforms.length > 1) ?? rated;

    return (
        <Stack gap={40}>
            <Stack gap="md">
                <Title order={3}>Tarjetas</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
                    {rated && (
                        <Item name="GameCard" file="src/components/GameCard.tsx" note="Galerías, portada, relacionados. Hover pio-lift.">
                            <GameCard game={rated} />
                        </Item>
                    )}
                    {dealGame && (
                        <Item name="GameCard con oferta" file="src/components/DealPriceLabel.tsx" note="La etiqueta «↓N% (i)» sale cuando el precio de la tarjeta ES la oferta del día.">
                            <GameCard game={dealGame} />
                        </Item>
                    )}
                </SimpleGrid>
                {rated && (
                    <Item name="FeaturedGameCard" file="src/components/FeaturedGameCard.tsx" note="Carrusel de destacados de la portada; aquí, la tarjeta activa.">
                        <Box py="sm">
                            <FeaturedGameCard game={rated} isActive side="active" />
                        </Box>
                    </Item>
                )}
                {saga && (
                    <Item name="SagaCard" file="src/components/SagaCard.tsx">
                        <Box maw={560}><SagaCard saga={saga} /></Box>
                    </Item>
                )}
            </Stack>

            <Stack gap="md">
                <Title order={3}>Sobre portada</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                    <Item name="CoverChip" file="src/components/CoverChip.tsx" note="Velo + radio sm + contenido blanco. strength: base (iconos) | strong (cifras).">
                        <Group p="md" style={{ background: 'var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-md)' }}>
                            {['new', 'used', 'store', 'key'].map((c) => (
                                <CoverChip key={c} p="2xs"><ConditionIcon condition={c} size={15} /></CoverChip>
                            ))}
                            <CoverChip strength="strong" px="2xs" py={2}><Text fz={11} fw={700} c="inherit">strong</Text></CoverChip>
                        </Group>
                    </Item>
                    <Item name="RatingPill" file="src/components/RatingPill.tsx" note="Nota sobre portada; color de la estrella por ratingColor.">
                        <Group p="md" style={{ background: 'var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-md)' }}>
                            {[3, 5, 7, 9].map((v) => <RatingPill key={v} value={v} />)}
                        </Group>
                    </Item>
                    <Item name="AffiliateMark" file="src/components/AffiliateMark.tsx" note="💸 sobre CoverChip. Solo se pinta con sesión de admin: sin ella aquí no aparece.">
                        <Text fz="sm" c="dimmed">Inicia sesión en /staff para verlo en las tarjetas.</Text>
                    </Item>
                </SimpleGrid>
            </Stack>

            <Stack gap="md">
                <Title order={3}>Insignias e iconos</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                    {withPlatforms && (
                        <Item name="PlatformBadge" file="src/components/PlatformBadge.tsx" note="Color desde el catálogo lib/platforms.ts.">
                            <Group gap="2xs">{withPlatforms.platforms.map((p) => <PlatformBadge key={p.id} platform={p} />)}</Group>
                        </Item>
                    )}
                    {withPlatforms && (
                        <Item name="DealConsoleTag" file="src/components/DealConsoleTag.tsx">
                            <Group gap="2xs">{withPlatforms.platforms.map((p) => <DealConsoleTag key={p.id} platform={p.slug} />)}</Group>
                        </Item>
                    )}
                    <Item name="ConditionIcon" file="src/components/ConditionIcon.tsx" note="Nuevo, usado, store y código. digital y download no tienen icono (hasConditionIcon).">
                        <Group gap="sm">{['new', 'used', 'store', 'key'].map((c) => <ConditionIcon key={c} condition={c} size={18} />)}</Group>
                    </Item>
                </SimpleGrid>
            </Stack>

            <Stack gap="md">
                <Title order={3}>Carga</Title>
                <Item name="GameGridSkeleton" file="src/components/GameGridSkeleton.tsx">
                    <GameGridSkeleton count={4} />
                </Item>
            </Stack>
        </Stack>
    );
}
