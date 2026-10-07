import type { Metadata } from 'next';
import ReportsStaffClient from './ReportsStaffClient';

export const metadata: Metadata = {
    title: 'Reportes (staff)',
    robots: { index: false, follow: false },
};

export default function StaffReportsPage() {
    return <ReportsStaffClient />;
}
