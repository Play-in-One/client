import { useEffect, useState } from 'react';
import { getMinPriceHistory } from '@/lib/api';
import { historySourceFor, sellerLocationsFor, type Prefs } from '@/lib/prefs';
import type { Game, MinPriceHistory } from '@/lib/types';

/** Carga la serie visible cuando el gráfico se acerca al viewport. El detalle
 * compacto siempre difiere el historial; admite también respuestas antiguas
 * con las series global y nacional embebidas. Cada respuesta queda ligada a
 * juego, ubicación, plataforma y condición para evitar mostrar datos viejos. */
export function useMinPriceHistory(game: Game, prefs: Prefs, options: { enabled?: boolean; platform?: string; condition?: string } = {}): {
    source: MinPriceHistory | undefined;
    loading: boolean;
    error?: boolean;
} {
    const { enabled = true, platform, condition } = options;
    const locations = sellerLocationsFor(prefs);
    const hasNational = Object.keys(game.min_price_history_national ?? {}).length > 0;
    const mode = historySourceFor(locations, hasNational);

    // La clave liga la respuesta a lo que se pidió: cambiar de filtro con una
    // petición en vuelo no debe pintar la serie del filtro anterior.
    const deferred = !!game.history_deferred;
    const key = `${game.id}:${locations ?? ''}:${deferred}:${platform ?? ""}:${condition ?? ""}`;
    const [remote, setRemote] = useState<{ key: string; data: MinPriceHistory; error?: boolean } | null>(null);

    useEffect(() => {
        if (!enabled || (!deferred && (mode !== 'remote' || locations === undefined))) return;
        const controller = new AbortController();
        getMinPriceHistory(game.id, locations, controller.signal, deferred, { platform, condition })
            .then((res) => { if (!controller.signal.aborted) setRemote({ key, data: res.min_price_history }); })
            // Sin dato fiable es mejor un gráfico vacío que uno de otro filtro.
            .catch(() => { if (!controller.signal.aborted) setRemote({ key, data: {}, error: true }); });
        return () => controller.abort();
    }, [mode, key, game.id, locations, deferred, enabled, platform, condition]);

    if (!deferred && mode === 'all') return { source: game.min_price_history, loading: false };
    if (!deferred && mode === 'national') return { source: game.min_price_history_national, loading: false };
    return remote?.key === key
        ? { source: remote.data, loading: false, error: remote.error }
        : { source: undefined, loading: true };
}
