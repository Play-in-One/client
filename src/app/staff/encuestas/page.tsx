import type { Metadata } from 'next';

import { SurveysStaffClient } from './SurveysStaffClient';

/* Panel interno, como /staff/analytics: fuera del sitemap y sin indexar; la
   barrera real es IsAdminUser en cada endpoint de /api/surveys/. */
export const metadata: Metadata = {
    title: 'Encuestas (staff)',
    robots: { index: false, follow: false },
};

export default function StaffSurveysPage() {
    return <SurveysStaffClient />;
}
