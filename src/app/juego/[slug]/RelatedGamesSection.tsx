import Link from 'next/link';
import { Anchor, Box, Container, Group, Title } from '@mantine/core';
import type { Game } from '@/lib/types';
import RelatedGamesGrid, { type RelatedQuery } from './RelatedGamesGrid';

/**
 * Juegos relacionados al pie de la ficha, renderizados en el SERVIDOR.
 *
 * Reemplaza a "Otros juegos populares", que sorteaba 4 juegos con
 * `Math.random()` y los volvía a pedir en el cliente: para un crawler cada
 * visita enlazaba fichas distintas, y el enlace de "ver más" iba a `/search`
 * a secas. Ahora la lista es determinista (misma saga, mismo género y
 * consola, o los populares de la consola, en ese orden; ver `page.tsx`) y el
 * "ver más" apunta a la página que agrupa ese criterio. La grilla la vuelve
 * a pedir el cliente solo si hay filtros globales activos (`RelatedGamesGrid`);
 * los enlaces del HTML del servidor no dependen de eso.
 *
 * Sin JSON-LD: son enlaces internos hacia otras fichas, no una lista que ESTA
 * página sea — un `ItemList` aquí declararía un catálogo que la ficha no es.
 */
export default function RelatedGamesSection({
    games,
    query,
    excludeId,
    limit,
    title,
    moreHref,
    moreLabel,
    platformSlug,
}: {
    games: Game[];
    /** El criterio con el que se eligieron, para repetirlo con filtros. */
    query: RelatedQuery;
    /** La ficha propia, que nunca se recomienda a sí misma. */
    excludeId: number;
    limit: number;
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
                <RelatedGamesGrid
                    initialGames={games}
                    query={query}
                    excludeId={excludeId}
                    limit={limit}
                    platformSlug={platformSlug}
                />
            </Container>
        </Box>
    );
}
