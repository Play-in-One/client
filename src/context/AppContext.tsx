'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ConditionFilter = 'all' | 'new' | 'used';

const CONDITION_STORAGE_KEY = 'pio_condition';

interface AppState {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    condition: ConditionFilter;
    setCondition: (c: ConditionFilter) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [condition, setConditionState] = useState<ConditionFilter>('all');

    // Read persisted value after mount only, so server/client markup match on hydration.
    useEffect(() => {
        const stored = window.localStorage.getItem(CONDITION_STORAGE_KEY);
        if (stored === 'new' || stored === 'used') setConditionState(stored);
    }, []);

    const setCondition = (c: ConditionFilter) => {
        setConditionState(c);
        window.localStorage.setItem(CONDITION_STORAGE_KEY, c);
    };

    return (
        <AppContext.Provider
            value={{
                searchQuery,
                setSearchQuery,
                condition,
                setCondition,
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
