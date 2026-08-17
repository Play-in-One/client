'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ConditionFilter = 'all' | 'new' | 'used';

const CONDITION_STORAGE_KEY = 'pio_condition';
const SAVED_GAMES_STORAGE_KEY = 'pio_saved_games';

export interface SavedGame {
    id: number;
    name: string;
    image: string | null;
    min_price: string | null;
    platforms: { id: number; name: string; slug: string; display_name: string }[];
    savedAt: string;
}

interface AppState {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    condition: ConditionFilter;
    setCondition: (c: ConditionFilter) => void;
    savedGames: SavedGame[];
    isSaved: (gameId: number) => boolean;
    toggleSaved: (game: SavedGame) => void;
    removeSaved: (gameId: number) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [condition, setConditionState] = useState<ConditionFilter>('all');
    const [savedGames, setSavedGamesState] = useState<SavedGame[]>([]);

    // Read persisted value after mount only, so server/client markup match on hydration.
    useEffect(() => {
        const stored = window.localStorage.getItem(CONDITION_STORAGE_KEY);
        if (stored === 'new' || stored === 'used') setConditionState(stored);
    }, []);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(SAVED_GAMES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setSavedGamesState(parsed);
            }
        } catch {
            // corrupt data or storage unavailable — ignore, stay with empty defaults
        }
    }, []);

    // Callbacks estables + value memoizado: el Provider envuelve toda la app
    // (layout.tsx), así que un value nuevo en cada render re-renderizaba el
    // árbol completo en cada tecla de búsqueda o clic del toggle de condición,
    // bloqueando el hilo antes de que saliera el fetch.
    const setCondition = useCallback((c: ConditionFilter) => {
        setConditionState(c);
        window.localStorage.setItem(CONDITION_STORAGE_KEY, c);
    }, []);

    const persistSavedGames = useCallback((games: SavedGame[]) => {
        setSavedGamesState(games);
        try {
            window.localStorage.setItem(SAVED_GAMES_STORAGE_KEY, JSON.stringify(games));
        } catch {
            // private browsing / quota exceeded — state still updates in-memory for this session
        }
    }, []);

    const isSaved = useCallback((gameId: number) => savedGames.some((g) => g.id === gameId), [savedGames]);

    const toggleSaved = useCallback((game: SavedGame) => {
        if (savedGames.some((g) => g.id === game.id)) {
            persistSavedGames(savedGames.filter((g) => g.id !== game.id));
        } else {
            persistSavedGames([game, ...savedGames]);
        }
    }, [savedGames, persistSavedGames]);

    const removeSaved = useCallback((gameId: number) => {
        persistSavedGames(savedGames.filter((g) => g.id !== gameId));
    }, [savedGames, persistSavedGames]);

    const value = useMemo(
        () => ({
            searchQuery,
            setSearchQuery,
            condition,
            setCondition,
            savedGames,
            isSaved,
            toggleSaved,
            removeSaved,
        }),
        [searchQuery, condition, setCondition, savedGames, isSaved, toggleSaved, removeSaved],
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
