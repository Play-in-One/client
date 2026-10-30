import type { Metadata } from 'next';
import DesignSystemClient from './DesignSystemClient';

export const metadata: Metadata = {
    title: 'Sistema de diseño (staff)',
    robots: { index: false, follow: false },
};

export default function StaffDesignSystemPage() {
    return <DesignSystemClient />;
}
