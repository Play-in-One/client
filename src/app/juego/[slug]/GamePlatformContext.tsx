'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface GamePlatformState {
    selectedPlatform: string | null;
    setSelectedPlatform: (slug: string) => void;
}

const GamePlatformContext = createContext<GamePlatformState | null>(null);

/**
 * Consola seleccionada en los tabs de la ficha, compartida entre
 * `GameDetailClient` (que la lee/escribe) y `PopularGamesSection` (que solo la
 * lee, para refetchear "Otros juegos populares" de esa consola).
 *
 * Vive fuera de la URL a propósito: cambiar de tab hoy es instantáneo —filtra
 * en memoria las ofertas ya cargadas, sin ir al servidor— y sincronizarlo con
 * `?platform=` obligaría a Next a re-renderizar el Server Component de la
 * página en cada clic.
 */
export function GamePlatformProvider({
    initialPlatform,
    children,
}: {
    initialPlatform: string | null;
    children: ReactNode;
}) {
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(initialPlatform);
    return (
        <GamePlatformContext.Provider value={{ selectedPlatform, setSelectedPlatform }}>
            {children}
        </GamePlatformContext.Provider>
    );
}

export function useGamePlatform() {
    const ctx = useContext(GamePlatformContext);
    if (!ctx) throw new Error('useGamePlatform debe usarse dentro de GamePlatformProvider');
    return ctx;
}
