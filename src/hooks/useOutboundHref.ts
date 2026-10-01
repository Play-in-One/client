'use client';

import { useEffect, useState } from 'react';
import { getAttribution, type Attribution } from '@/lib/attribution';
import { outboundHref } from '@/lib/outbound';

/** SSR already exposes a usable link; hydration adds this tab's attribution. */
export function useOutboundHref() {
    const [attribution, setAttribution] = useState<Attribution>({});
    useEffect(() => { setAttribution(getAttribution()); }, []);
    return (kind: 'product' | 'store', id: number) => outboundHref(kind, id, attribution);
}
