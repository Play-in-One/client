import type { Metadata } from 'next';

import { AnalyticsClient } from './AnalyticsClient';

/* Panel interno. Como /staff, no se enlaza desde ninguna parte y queda fuera
   del sitemap; la barrera real es el login staff, que aplica el backend en cada
   endpoint de /api/analytics/. */
export const metadata: Metadata = {
    title: 'Analítica',
    robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
    return <AnalyticsClient />;
}
