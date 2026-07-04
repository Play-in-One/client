'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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

    const setCondition = (c: ConditionFilter) => {
        setConditionState(c);
        window.localStorage.setItem(CONDITION_STORAGE_KEY, c);
    };

    const persistSavedGames = (games: SavedGame[]) => {
        setSavedGamesState(games);
        try {
            window.localStorage.setItem(SAVED_GAMES_STORAGE_KEY, JSON.stringify(games));
        } catch {
            // private browsing / quota exceeded — state still updates in-memory for this session
        }
    };

    const isSaved = (gameId: number) => savedGames.some((g) => g.id === gameId);

    const toggleSaved = (game: SavedGame) => {
        if (isSaved(game.id)) {
            persistSavedGames(savedGames.filter((g) => g.id !== game.id));
        } else {
            persistSavedGames([game, ...savedGames]);
        }
    };

    const removeSaved = (gameId: number) => {
        persistSavedGames(savedGames.filter((g) => g.id !== gameId));
    };

    return (
        <AppContext.Provider
            value={{
                searchQuery,
                setSearchQuery,
                condition,
                setCondition,
                savedGames,
                isSaved,
                toggleSaved,
                removeSaved,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
