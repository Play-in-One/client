'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Loader } from '@mantine/core';
import { getPlatforms } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import { unpackGames, type GamesPayload } from '@/lib/gamePayload';
import GameExplorer from '@/components/game-explorer/GameExplorer';
import { FindConsoleButton } from '@/components/consoles/FindConsoleButton';
import { isConsolePlatform } from '@/lib/consoles';

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
    initialPlatforms,
    initialResultsMatchFilters,
    consolesAvailable,
}: {
    initialGames: Game[];
    initialTotal: number;
    initialPlatforms: Platform[];
    initialResultsMatchFilters: boolean;
    consolesAvailable: boolean;
}) {
    const router = useRouter();
    const params = useSearchParams();
    const q = params.get('q') ?? '';
    const platformSlug = params.get('platform') ?? '';
    const page = Number(params.get('page')) || 1;
    const genre = params.get('genre') ? Number(params.get('genre')) : null;
    const priceMin = params.get('price_min') ? Number(params.get('price_min')) : undefined;
    const priceMax = params.get('price_max') ? Number(params.get('price_max')) : undefined;
    const ratingMin = params.get('rating_min') ? Number(params.get('rating_min')) : undefined;
    const onSale = params.get('on_sale') === '1';
    const ordering = params.get('ordering') || DEFAULT_ORDERING;

    /* Platform is derived from the URL — the URL is the single source of truth,
       so header links and the sidebar selector stay in sync automatically. */
    const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
    // También al fallar: sin catálogo de consolas la galería degrada a no
    // filtrar por consola, en vez de quedarse en el skeleton para siempre.
    const [platformsLoaded, setPlatformsLoaded] = useState(initialPlatforms.length > 0);
    useEffect(() => {
        if (initialPlatforms.length > 0) return;
        getPlatforms()
            .then((res) => setPlatforms(res.results))
            .catch(() => { })
            .finally(() => setPlatformsLoaded(true));
    }, [initialPlatforms]);

    const selectedPlatforms = useMemo(() => {
        if (!platformSlug) return [];
        const slugs = platformSlug.split(',').map((s) => s.trim()).filter(Boolean);
        return platforms.filter((p) => slugs.includes(p.slug)).map((p) => p.id);
    }, [platformSlug, platforms]);

    /* Todo lector de un filtro (página incluida) pasa por acá: una sola
       `router.replace` por acción evita que dos cambios en el mismo evento
       síncrono (p.ej. cambiar de género también resetea la página) se pisen
       entre sí partiendo del mismo snapshot de `params`. */
    const replaceParams = (mutate: (usp: URLSearchParams) => void) => {
        const usp = new URLSearchParams(params.toString());
        mutate(usp);
        router.replace(`/search?${usp.toString()}`, { scroll: false });
    };

    const setPlatformFilter = (nextIds: number[]) => replaceParams((usp) => {
        const nextSlugs = platforms.filter((p) => nextIds.includes(p.id)).map((p) => p.slug);
        if (nextSlugs.length) usp.set('platform', nextSlugs.join(',')); else usp.delete('platform');
        usp.delete('page');
    });
    const onGenreChange = (id: number | null) => replaceParams((usp) => {
        if (id != null) usp.set('genre', String(id)); else usp.delete('genre');
        usp.delete('page');
    });
    const onPriceMinChange = (v: number | undefined) => replaceParams((usp) => {
        if (v != null) usp.set('price_min', String(v)); else usp.delete('price_min');
        usp.delete('page');
    });
    const onPriceMaxChange = (v: number | undefined) => replaceParams((usp) => {
        if (v != null) usp.set('price_max', String(v)); else usp.delete('price_max');
        usp.delete('page');
    });
    const onRatingMinChange = (v: number | undefined) => replaceParams((usp) => {
        if (v != null) usp.set('rating_min', String(v)); else usp.delete('rating_min');
        usp.delete('page');
    });
    const onOnSaleChange = (v: boolean) => replaceParams((usp) => {
        if (v) usp.set('on_sale', '1'); else usp.delete('on_sale');
        usp.delete('page');
    });
    const onOrderingChange = (v: string) => replaceParams((usp) => {
        if (v && v !== DEFAULT_ORDERING) usp.set('ordering', v); else usp.delete('ordering');
        usp.delete('page');
    });
    const onQueryChange = (text: string) => replaceParams((usp) => {
        if (text) usp.set('q', text); else usp.delete('q');
        usp.delete('page');
    });
    const onPageChange = (p: number) => replaceParams((usp) => {
        if (p > 1) usp.set('page', String(p)); else usp.delete('page');
    });
    const onClearFilters = () => replaceParams((usp) => {
        usp.delete('genre');
        usp.delete('price_min');
        usp.delete('price_max');
        usp.delete('rating_min');
        usp.delete('on_sale');
        usp.delete('page');
        usp.delete('platform');
    });

    return (
        <GameExplorer
            initialGames={initialGames}
            initialTotal={initialTotal}
            initialPlatforms={platforms}
            initialResultsMatchFilters={initialResultsMatchFilters}
            pageSize={GAMES_PAGE_SIZE}
            defaultOrdering={ordering}
            selectedPlatformIds={selectedPlatforms}
            onPlatformFilterChange={setPlatformFilter}
            filtersReady={!platformSlug || platformsLoaded}
            showSearchInput
            query={q}
            page={page}
            onPageChange={onPageChange}
            genre={genre}
            onGenreChange={onGenreChange}
            priceMin={priceMin}
            onPriceMinChange={onPriceMinChange}
            priceMax={priceMax}
            onPriceMaxChange={onPriceMaxChange}
            ratingMin={ratingMin}
            onRatingMinChange={onRatingMinChange}
            onSale={onSale}
            onOnSaleChange={onOnSaleChange}
            onOrderingChange={onOrderingChange}
            onQueryChange={onQueryChange}
            onClearFilters={onClearFilters}
            showHeader
            // With exactly one console filtered, its own catalog; otherwise every console.
            headerAction={<FindConsoleButton available={consolesAvailable}
                platform={isConsolePlatform(platformSlug) ? { slug: platformSlug } : null} />}
            withContainer
        />
    );
}

export default function SearchClient({
    initialGames: payload = [],
    initialTotal = 0,
    initialPlatforms = [],
    initialResultsMatchFilters = false,
    consolesAvailable = false,
}: {
    /** Primera página resuelta en el servidor, solo para la entrada limpia a
     *  /search (sin filtros ni búsqueda). Es lo que hace que la galería exista
     *  en el HTML: los crawlers de IA no ejecutan el useEffect que la llenaba. */
    initialGames?: Game[] | GamesPayload;
    initialTotal?: number;
    initialPlatforms?: Platform[];
    initialResultsMatchFilters?: boolean;
    /** The server saw a published console: «Encuentra tu próxima consola» is a public link. */
    consolesAvailable?: boolean;
}) {
    const initialGames = useMemo(() => unpackGames(payload), [payload]);
    return (
        <Suspense fallback={<Container py="xl"><Loader aria-label="Cargando juegos" color="primaryRed" /></Container>}>
            <SearchContent initialGames={initialGames} initialTotal={initialTotal}
                initialPlatforms={initialPlatforms}
                initialResultsMatchFilters={initialResultsMatchFilters} consolesAvailable={consolesAvailable} />
        </Suspense>
    );
}
