import { useEffect, useState } from 'react';
import { getMinPriceHistory } from '@/lib/api';
import { historySourceFor, sellerLocationsFor, type Prefs } from '@/lib/prefs';
import type { Game, MinPriceHistory } from '@/lib/types';

/** La serie del historial de precio mínimo que corresponde al filtro de
 *  ubicación activo.
 *
 *  El detalle trae embebidas la serie de todas las tiendas y la de «sin
 *  importadoras»; con cualquier otra combinación (una región, las nacionales
 *  apagadas…) la serie exacta se pide al backend, que la calcula con las
 *  tiendas visibles. Mientras llega devuelve `loading` y ninguna serie, para no
 *  dibujar una que contradiga al precio de la tabla. */
export function useMinPriceHistory(game: Game, prefs: Prefs): {
    source: MinPriceHistory | undefined;
    loading: boolean;
} {
    const locations = sellerLocationsFor(prefs);
    const hasNational = Object.keys(game.min_price_history_national ?? {}).length > 0;
    const mode = historySourceFor(locations, hasNational);

    // La clave liga la respuesta a lo que se pidió: cambiar de filtro con una
    // petición en vuelo no debe pintar la serie del filtro anterior.
    const key = `${game.id}:${locations ?? ''}`;
    const [remote, setRemote] = useState<{ key: string; data: MinPriceHistory } | null>(null);

    useEffect(() => {
        if (mode !== 'remote' || locations === undefined) return;
        const controller = new AbortController();
        getMinPriceHistory(game.id, locations, controller.signal)
            .then((res) => setRemote({ key, data: res.min_price_history }))
            // Sin dato fiable es mejor un gráfico vacío que uno de otro filtro.
            .catch(() => { if (!controller.signal.aborted) setRemote({ key, data: {} }); });
        return () => controller.abort();
    }, [mode, key, game.id, locations]);

    if (mode === 'all') return { source: game.min_price_history, loading: false };
    if (mode === 'national') return { source: game.min_price_history_national, loading: false };
    return remote?.key === key
        ? { source: remote.data, loading: false }
        : { source: undefined, loading: true };
}
