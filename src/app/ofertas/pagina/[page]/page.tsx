import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import DealsLanding, { buildDealsMetadata } from '../../DealsLanding';
import { dealsPagePath, parseDealsPage } from '@/lib/deals';

export const revalidate = 3600;
export function generateStaticParams() { return []; }

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const page = parseDealsPage((await params).page);
    if (page === undefined || page === 1) return { title: 'Página no encontrada', robots: { index: false, follow: true } };
    return buildDealsMetadata(undefined, page);
}

export default async function PaginatedDealsPage({ params }: Props) {
    const page = parseDealsPage((await params).page);
    if (page === undefined) notFound();
    if (page === 1) permanentRedirect(dealsPagePath());
    return <DealsLanding page={page} />;
}
