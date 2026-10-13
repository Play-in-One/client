'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAdmin } from './AdminContext';
import { useApp } from './AppContext';
import { getProductPreviews } from '@/lib/api';
import { ProductPreviewStore, previewFilterKey } from '@/lib/staffProductPreviews';
import type { Game, ProductPreviewFilters } from '@/lib/types';

const Context = createContext<{ store: ProductPreviewStore; active: boolean; defaults: ProductPreviewFilters } | null>(null);
const noopSubscribe = () => () => {};
const emptySnapshot = () => undefined;

export function StaffProductPreviewProvider({ children }: { children: ReactNode }) {
    const { token, isAdmin, showProductImages } = useAdmin();
    const { conditionParam, sellerLocationsParam, ready } = useApp();
    const [store] = useState(() => new ProductPreviewStore(getProductPreviews));
    const active = isAdmin && showProductImages && ready;
    const defaults = useMemo(() => ({ condition: conditionParam, seller_locations: sellerLocationsParam }), [conditionParam, sellerLocationsParam]);
    const session = token ? `${token}:${previewFilterKey(defaults)}` : null;
    useLayoutEffect(() => {
        store.configure(active, session);
        return () => store.configure(false, null);
    }, [store, active, session]);
    const value = useMemo(() => ({ store, active, defaults }), [store, active, defaults]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStaffProductPreviews(game: Game, overrides?: ProductPreviewFilters) {
    const context = useContext(Context);
    // Canonical string keeps subscriptions stable even when callers use an inline object.
    const key = previewFilterKey({ ...context?.defaults, ...overrides });
    const filters = useMemo<ProductPreviewFilters>(() => {
        const parsed = JSON.parse(key);
        return {
            ...(parsed.platforms.length ? { platforms: parsed.platforms } : {}),
            ...(parsed.platform ? { platform: parsed.platform } : {}),
            ...(parsed.condition ? { condition: parsed.condition } : {}),
            ...(parsed.seller ? { seller: parsed.seller } : {}),
            ...(parsed.seller_locations ? { seller_locations: parsed.seller_locations } : {}),
        };
    }, [key]);
    const store = context?.store;
    const active = context?.active ?? false;
    const subscribe = useCallback((notify: () => void) => active && store
        ? store.subscribe(game.id, filters, game, notify) : noopSubscribe(), [store, active, game, filters]);
    const snapshot = useCallback(() => active && store ? store.getSnapshot(game.id, filters) : undefined, [store, active, game.id, filters]);
    return useSyncExternalStore(subscribe, snapshot, emptySnapshot);
}
