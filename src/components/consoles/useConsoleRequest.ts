'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/lib/api';
import type { ConsoleQuery } from '@/lib/consoles';

export type ConsoleLoader<T> = (query: ConsoleQuery, signal: AbortSignal) => Promise<T>;

/** Loads a console view and reloads it whenever the query or the global store
 *  location preference changes. Without `initial` (the staff preview, which the
 *  server cannot render) it starts busy and waits for `enabled`. */
export function useConsoleRequest<T>(initial: T | null, query: ConsoleQuery, load: ConsoleLoader<T>, enabled = true) {
    const { condition, sellerLocationsParam, ready } = useApp();
    const [data, setData] = useState(initial);
    const [error, setError] = useState(false);
    const [missing, setMissing] = useState(false);
    const [busy, setBusy] = useState(initial === null);
    const [retry, setRetry] = useState(0);
    const queryKey = JSON.stringify(query);
    // Which query the shown data answers. A reload of the same query (the
    // visitor's preferences after hydration) keeps the content on screen; a
    // new query (another pack, condition or filter) shows skeletons instead
    // of stale numbers. Without this, a server-rendered page would flash
    // skeletons on every visit.
    const [dataKey, setDataKey] = useState<string | null>(initial === null ? null : queryKey);
    useEffect(() => {
        if (!ready || !enabled) return;
        const controller = new AbortController();
        setBusy(true);
        setError(false);
        const selected = JSON.parse(queryKey) as ConsoleQuery;
        // Hardware always uses the physical condition, regardless of the games' format preference.
        load({ ...selected, condition: selected.condition ?? (condition === 'all' ? undefined : condition),
            seller_locations: sellerLocationsParam ?? selected.seller_locations }, controller.signal)
            .then(result => { if (!controller.signal.aborted) { setData(result); setMissing(false); setDataKey(queryKey); } })
            .catch(cause => {
                if (controller.signal.aborted) return;
                if (cause instanceof ApiError && cause.status === 404) setMissing(true);
                else setError(true);
            })
            .finally(() => { if (!controller.signal.aborted) setBusy(false); });
        return () => controller.abort();
    }, [queryKey, condition, sellerLocationsParam, ready, enabled, load, retry]);
    return { data, error, missing, busy, stale: busy && dataKey !== queryKey, retry: () => setRetry(value => value + 1) };
}

/** Writes the query to the address bar without a navigation (the view already
 *  holds it in state). On `/search` it keeps the console tab selected. */
export function replaceQueryInUrl(encoded: string) {
    const params = new URLSearchParams(encoded.replace(/^\?/, ''));
    if (window.location.pathname === '/search') params.set('category', 'console');
    const next = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
}
