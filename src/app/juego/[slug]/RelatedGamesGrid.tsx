'use client';

import { useEffect, useState } from 'react';
import { Box, SimpleGrid } from '@mantine/core';
import GameCard from '@/components/GameCard';
import GameGridSkeleton from '@/components/GameGridSkeleton';
import { useApp } from '@/context/AppContext';
import { getGames, getPopularGames } from '@/lib/api';
import type { Game } from '@/lib/types';

/** Criterio que eligió el servidor, para repetir la MISMA consulta con los
 *  filtros globales. Serializable: cruza la frontera servidor → cliente. */
export type RelatedQuery =
    | { kind: 'saga'; saga: string }
    | { kind: 'genre'; genre: number; platform?: number }
    | { kind: 'popular'; platform?: string; limit: number };

const ORDERING = '-traffic_score,name';

/**
 * Grilla de juegos relacionados. El servidor la manda resuelta SIN filtros
 * (es lo que lee un crawler y lo que ve todo visitante con los filtros por
 * defecto); quien tiene algún filtro global activo la vuelve a pedir con
 * ellos, igual que «Populares» en la home (`HomeClient`). Sin eso, la tarjeta
 * mostraría el precio de una importadora que el visitante apagó.
 *
 * `data-prefs-dependent` tapa la grilla sin filtrar hasta que AppContext lee
 * las preferencias (ver globals.css), así que no asoma un precio que no toca.
 * Pero ese atributo se retira en cuanto las preferencias están listas, ANTES
 * de que llegue la respuesta filtrada: en esa ventana se pinta un skeleton
 * (`filtering`, como «Populares» en la home) en vez de las tarjetas del
 * servidor. Con filtros por defecto —y para un crawler— nada cambia: el HTML
 * del servidor sigue llevando las tarjetas.
 */
export default function RelatedGamesGrid({
    initialGames,
    query,
    excludeId,
    limit,
    platformSlug,
}: {
    initialGames: Game[];
    query: RelatedQuery;
    excludeId: number;
    limit: number;
    platformSlug?: string;
}) {
    const { conditionParam, sellerLocationsParam, ready } = useApp();
    const [games, setGames] = useState<Game[]>(initialGames);
    const [filtering, setFiltering] = useState(false);
    // Hay que filtrar en cuanto las preferencias están leídas y alguna se
    // desvía del default. Se deriva en el render y no solo del estado: el
    // `setFiltering(true)` del efecto llega un render después de que
    // AppContext retire `data-prefs`, y en ese cuadro asomarían las tarjetas
    // sin filtrar. `games === initialGames` = aún no llegó nada filtrado.
    const needsFilter = ready && (!!conditionParam || !!sellerLocationsParam);
    const showSkeleton = filtering || (needsFilter && games === initialGames);

    useEffect(() => {
        // Sin las preferencias leídas los params valen su default optimista.
        if (!ready) return;
        // Sobre los params DERIVADOS (ver HomeClient): "físico + todos" deja
        // `condition` en 'all' pero sí acota.
        if (!conditionParam && !sellerLocationsParam) {
            setGames(initialGames);
            setFiltering(false);
            return;
        }
        const controller = new AbortController();
        let superseded = false;
        setFiltering(true);
        const filters = {
            condition: conditionParam,
            seller_locations: sellerLocationsParam,
            signal: controller.signal,
        };
        const request =
            query.kind === 'saga'
                ? getGames({ ...filters, saga: query.saga, ordering: ORDERING })
                : query.kind === 'genre'
                    ? getGames({
                        ...filters,
                        genres: query.genre,
                        ...(query.platform != null ? { platforms: [query.platform] } : {}),
                        ordering: ORDERING,
                    })
                    : getPopularGames({ ...filters, platform: query.platform, limit: query.limit });
        request
            .then((res) => {
                if (superseded) return;
                setGames(res.results.filter((g) => g.id !== excludeId).slice(0, limit));
                setFiltering(false);
            })
            .catch(() => {
                // Mejor sin tarjetas que con precios que el filtro excluye. Si
                // la corrida fue reemplazada, la nueva ya maneja `filtering`.
                if (superseded) return;
                setGames([]);
                setFiltering(false);
            });
        return () => {
            superseded = true;
            controller.abort();
        };
    }, [ready, conditionParam, sellerLocationsParam, query, excludeId, limit, initialGames]);

    return (
        <Box data-prefs-dependent>
            {showSkeleton ? (
                <GameGridSkeleton count={limit} testId="related-games-skeleton" />
            ) : (
                <SimpleGrid cols={{ base: 2, md: 4 }} spacing={{ base: 'xs', xs: 'lg' }}>
                    {games.map((g) => (
                        <GameCard key={g.id} game={g} platformSlug={platformSlug} />
                    ))}
                </SimpleGrid>
            )}
        </Box>
    );
}
