import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import SavedClient from './SavedClient';

// Per-user content (localStorage) — keep it out of search indexes.
export const metadata: Metadata = buildMetadata({
    title: 'Mis juegos guardados',
    description: 'Tus juegos guardados en Play in One.',
    path: '/saved',
    noIndex: true,
});

export default function SavedPage() {
    return <SavedClient />;
}
