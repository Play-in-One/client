'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Platform } from '@/lib/types';

interface AppState {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    selectedPlatform: Platform | null;
    setSelectedPlatform: (p: Platform | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

    const setSearch = useCallback((q: string) => setSearchQuery(q), []);
    const setPlatform = useCallback((p: Platform | null) => setSelectedPlatform(p), []);

    return (
        <AppContext.Provider
            value={{
                searchQuery,
                setSearchQuery: setSearch,
                selectedPlatform,
                setSelectedPlatform: setPlatform,
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
