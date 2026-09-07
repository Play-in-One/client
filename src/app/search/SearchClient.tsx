'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, SimpleGrid, Text, Title, Loader } from '@mantine/core';
import { getPlatforms } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import GameCard from '@/components/GameCard';
import GameExplorer from '@/components/game-explorer/GameExplorer';

/* Debe coincidir con API_PAGE_SIZE del backend (default 24). El backend no
   expone page_size como query param, así que el frontend fija el mismo valor. */
const GAMES_PAGE_SIZE = 24;

/* Orden inicial de la galería. El segundo campo NO es decorativo: la mayoría del
   catálogo comparte traffic_score = 0, y sin desempate por nombre el backend los
   devolvería en orden arbitrario y un mismo juego podría repetirse entre páginas. */
const DEFAULT_ORDERING = '-traffic_score,name';

function SearchContent({
    initialGames,
    initialTotal,
}: {
    initialGames: Game[];
    initialTotal: number;
}) {
    const router = useRouter();
    const params = useSearchParams();
    const q = params.get('q') ?? '';
    const platformSlug = params.get('platform') ?? '';

    /* Platform is derived from the URL — the URL is the single source of truth,
       so header links and the sidebar selector stay in sync automatically. */
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    useEffect(() => {
        getPlatforms()
            .then((res) => setPlatforms(res.results))
            .catch(() => { });
    }, []);

    const selectedPlatforms = useMemo(() => {
        if (!platformSlug) return [];
        const slugs = platformSlug.split(',').map((s) => s.trim()).filter(Boolean);
        return platforms.filter((p) => slugs.includes(p.slug)).map((p) => p.id);
    }, [platformSlug, platforms]);

    const setPlatformFilter = (nextIds: number[]) => {
        const nextSlugs = platforms.filter((p) => nextIds.includes(p.id)).map((p) => p.slug);
        const usp = new URLSearchParams(params.toString());
        if (nextSlugs.length) usp.set('platform', nextSlugs.join(',')); else usp.delete('platform');
        router.replace(`/search?${usp.toString()}`, { scroll: false });
    };

    return (
        <GameExplorer
            initialGames={initialGames}
            initialTotal={initialTotal}
            pageSize={GAMES_PAGE_SIZE}
            defaultOrdering={DEFAULT_ORDERING}
            selectedPlatformIds={selectedPlatforms}
            onPlatformFilterChange={setPlatformFilter}
            showSearchInput
            query={q}
            showHeader
            withContainer
        />
    );
}

export default function SearchClient({
    initialGames = [],
    initialTotal = 0,
}: {
    /** Primera página resuelta en el servidor, solo para la entrada limpia a
     *  /search (sin filtros ni búsqueda). Es lo que hace que la galería exista
     *  en el HTML: los crawlers de IA no ejecutan el useEffect que la llenaba. */
    initialGames?: Game[];
    initialTotal?: number;
}) {
    return (
        // El fallback NO es un spinner: es la galería que resolvió el servidor.
        //
        // `SearchContent` usa useSearchParams(), y eso deja a todo el subárbol
        // fuera del render del servidor — el HTML solo traía el fallback. Con un
        // Loader ahí, un crawler que no ejecuta JavaScript veía una página vacía
        // por mucho que la primera página estuviera resuelta arriba.
        //
        // Poniendo la grilla real como fallback, el HTML inicial trae los juegos
        // y React la reemplaza por la versión interactiva al hidratar. De paso
        // quien entra ve portadas en vez de un spinner. Sin resultados del
        // servidor (entrada con filtros) se cae al Loader de siempre.
        <Suspense
            fallback={
                initialGames.length > 0 ? (
                    <StaticResults games={initialGames} total={initialTotal} />
                ) : (
                    <Container py="xl"><Loader color="primaryRed" /></Container>
                )
            }
        >
            <SearchContent initialGames={initialGames} initialTotal={initialTotal} />
        </Suspense>
    );
}

/** La galería tal como la deja el servidor: sin filtros, sin paginación y sin
 *  nada que dependa de la URL. Solo se usa como fallback del Suspense de
 *  arriba, así que su única misión es existir en el HTML. */
function StaticResults({ games, total }: { games: Game[]; total: number }) {
    return (
        <Container size="xl" py="xl">
            <Title order={1} fz={{ base: 24, md: 32 }} fw={800} mb="xs">
                Explorar juegos
            </Title>
            <Text c="dimmed" fz="sm" mb="lg">
                {total.toLocaleString('es-CL')} juegos comparados entre tiendas chilenas.
            </Text>
            <SimpleGrid cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', xs: 'lg' }}>
                {games.map((g, i) => (
                    <GameCard key={g.id} game={g} priority={i < 4} />
                ))}
            </SimpleGrid>
        </Container>
    );
}
