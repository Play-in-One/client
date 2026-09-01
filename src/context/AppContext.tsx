'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
    DEFAULT_PREFS,
    PREFS_COOKIE,
    parsePrefs,
    sellerScopeFor,
    writePrefsCookie,
    type ConditionFilter,
    type Prefs,
} from '@/lib/prefs';
import { readCookie } from '@/lib/consent';

export type { ConditionFilter };

const CONDITION_STORAGE_KEY = 'pio_condition';
const INTERNATIONAL_STORAGE_KEY = 'pio_international';
const SAVED_GAMES_STORAGE_KEY = 'pio_saved_games';

export interface SavedGame {
    id: number;
    savedAt: string;
}

interface AppState {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    condition: ConditionFilter;
    setCondition: (c: ConditionFilter) => void;
    /** Filtro global de procedencia. Al apagarlo, las ofertas de tiendas
     *  internacionales dejan de contar en toda la plataforma. */
    includeInternational: boolean;
    setIncludeInternational: (v: boolean) => void;
    /** El valor de `?seller_scope=` que le toca a la API, o undefined cuando no
     *  hay que acotar nada. Vive aquí para que los cinco consumidores no
     *  repitan la traducción. */
    sellerScopeParam: string | undefined;
    /** `false` durante el primer render, hasta que se leen las preferencias
     *  guardadas. Quien pinte contenido que dependa de los filtros debe
     *  esperar: si no, muestra lo que el servidor mandó sin filtrar y lo
     *  corrige un instante después. Mismo contrato que `ConsentContext.ready`. */
    ready: boolean;
    savedGames: SavedGame[];
    isSaved: (gameId: number) => boolean;
    toggleSaved: (gameId: number) => void;
    removeSaved: (gameId: number) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [condition, setConditionState] = useState<ConditionFilter>('all');
    // Por defecto se ven todas las tiendas: quien no quiera importaciones las
    // apaga. Arrancar apagado escondería catálogo al visitante nuevo.
    const [includeInternational, setIncludeInternationalState] = useState(true);
    const [savedGames, setSavedGamesState] = useState<SavedGame[]>([]);
    const [ready, setReady] = useState(false);

    /* Los valores persistidos se leen DESPUÉS de montar, para que el marcado del
       servidor y el del cliente coincidan en la hidratación. Lo que evita el
       parpadeo no es leerlos antes —no se puede— sino que quien depende de
       ellos espere a `ready`, y que el script del <head> tape mientras tanto. */
    useEffect(() => {
        // La cookie manda: es lo que ya leyeron el servidor y el script del
        // <head>, así que seguirla garantiza que los tres coincidan.
        // localStorage queda de respaldo para quien guardó su preferencia antes
        // de que existiera la cookie.
        const stored = window.localStorage.getItem(CONDITION_STORAGE_KEY);
        const legacy: Prefs = {
            condition: stored === 'new' || stored === 'used' ? stored : DEFAULT_PREFS.condition,
            international: window.localStorage.getItem(INTERNATIONAL_STORAGE_KEY) !== 'false',
        };
        const cookie = readCookie(PREFS_COOKIE);
        const prefs = cookie ? parsePrefs(cookie) : legacy;

        setConditionState(prefs.condition);
        setIncludeInternationalState(prefs.international);
        if (!cookie) writePrefsCookie(prefs);   // migración desde localStorage
        setReady(true);
    }, []);

    /* Los dos filtros viajan juntos en una sola cookie, pero cada uno tiene su
       propio setter, y los setters son estables a propósito (deps vacías: el
       Provider envuelve toda la app y recrearlos re-renderizaría el árbol
       entero). Estas refs les dan el valor del OTRO filtro sin capturarlo. */
    const conditionRef = useRef(condition);
    const includeInternationalRef = useRef(includeInternational);
    useEffect(() => {
        conditionRef.current = condition;
        includeInternationalRef.current = includeInternational;
    }, [condition, includeInternational]);

    /* El atributo lo pone el script del <head> antes de la primera pintura y lo
       quita React cuando ya puede renderizar con la preferencia correcta. Entre
       ambos momentos el CSS mantiene ocultos los bloques que dependen de los
       filtros (ver globals.css). */
    useEffect(() => {
        if (ready) document.documentElement.removeAttribute('data-prefs');
    }, [ready]);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(SAVED_GAMES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Solo id + savedAt: descarta cualquier campo viejo (image, min_price, ...)
                // que haya quedado de versiones anteriores que congelaban el snapshot.
                if (Array.isArray(parsed)) {
                    setSavedGamesState(
                        parsed
                            .filter((g) => g && typeof g.id === 'number')
                            .map((g) => ({ id: g.id, savedAt: g.savedAt ?? new Date().toISOString() })),
                    );
                }
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
        writePrefsCookie({ condition: c, international: includeInternationalRef.current });
    }, []);

    const setIncludeInternational = useCallback((v: boolean) => {
        setIncludeInternationalState(v);
        window.localStorage.setItem(INTERNATIONAL_STORAGE_KEY, String(v));
        writePrefsCookie({ condition: conditionRef.current, international: v });
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

    const toggleSaved = useCallback((gameId: number) => {
        if (savedGames.some((g) => g.id === gameId)) {
            persistSavedGames(savedGames.filter((g) => g.id !== gameId));
        } else {
            persistSavedGames([{ id: gameId, savedAt: new Date().toISOString() }, ...savedGames]);
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
            includeInternational,
            setIncludeInternational,
            sellerScopeParam: sellerScopeFor(includeInternational),
            ready,
            savedGames,
            isSaved,
            toggleSaved,
            removeSaved,
        }),
        [
            searchQuery, condition, setCondition,
            includeInternational, setIncludeInternational, ready,
            savedGames, isSaved, toggleSaved, removeSaved,
        ],
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
