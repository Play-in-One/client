'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const SurveyWidget = dynamic(() => import('./SurveyWidget').then(module => module.SurveyWidget), { ssr: false });

/** Keep the widget mounted once loaded: answers and the open modal survive
 * navigation. A visit that never reaches home does not load survey code/data. */
export default function DeferredSurveyWidget() {
    const pathname = usePathname();
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        if (enabled || pathname !== '/') return;
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(() => setEnabled(true), { timeout: 1500 });
            return () => window.cancelIdleCallback(id);
        }
        const id = setTimeout(() => setEnabled(true), 250);
        return () => clearTimeout(id);
    }, [enabled, pathname]);
    return enabled ? <SurveyWidget /> : null;
}
