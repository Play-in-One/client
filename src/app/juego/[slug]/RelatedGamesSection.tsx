import Link from 'next/link';
import { Anchor, Box, Container, Group, SimpleGrid, Title } from '@mantine/core';
import GameCard from '@/components/GameCard';
import type { Game } from '@/lib/types';

/**
 * Juegos relacionados al pie de la ficha, renderizados en el SERVIDOR.
 *
 * Reemplaza a "Otros juegos populares", que sorteaba 4 juegos con
 * `Math.random()` y los volvía a pedir en el cliente: para un crawler cada
 * visita enlazaba fichas distintas, y el enlace de "ver más" iba a `/search`
 * a secas. Ahora la lista es determinista (misma saga, mismo género y
 * consola, o los populares de la consola, en ese orden; ver `page.tsx`) y el
 * "ver más" apunta a la página que agrupa ese criterio.
 *
 * Sin JSON-LD: son enlaces internos hacia otras fichas, no una lista que ESTA
 * página sea — un `ItemList` aquí declararía un catálogo que la ficha no es.
 */
export default function RelatedGamesSection({
    games,
    title,
    moreHref,
    moreLabel,
    platformSlug,
}: {
    games: Game[];
    title: string;
    moreHref: string;
    moreLabel: string;
    /** Consola de la ficha: la tarjeta sin precio abre la ficha en ella. */
    platformSlug?: string;
}) {
    if (games.length === 0) return null;

    return (
        <Box component="section" aria-labelledby="juegos-relacionados" pb={60}>
            {/* 'lg' como el Container de GameDetailClient y el de FaqSection: con
                otro tamaño la sección se sale por un lado del resto de la ficha. */}
            <Container size="lg">
                <Group justify="space-between" align="flex-end" mb="xl">
                    <Title order={2} id="juegos-relacionados" fz="lg" fw={700}>
                        {title}
                    </Title>
                    <Anchor
                        component={Link}
                        href={moreHref}
                        c="var(--mantine-color-primaryRed-5)"
                        fw={600}
                        fz="sm"
                        underline="never"
                    >
                        {moreLabel}
                    </Anchor>
                </Group>
                <SimpleGrid cols={{ base: 2, md: 4 }} spacing={{ base: 'xs', xs: 'lg' }}>
                    {games.map((g) => (
                        <GameCard key={g.id} game={g} platformSlug={platformSlug} />
                    ))}
                </SimpleGrid>
            </Container>
        </Box>
    );
}
