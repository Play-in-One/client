import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import DealsLanding, { buildDealsMetadata } from '../../../DealsLanding';
import { dealsPagePath, parseDealsPage } from '@/lib/deals';

export const revalidate = 3600;
export function generateStaticParams() { return []; }

type Props = { params: Promise<{ platform: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { platform, page: raw } = await params;
    const page = parseDealsPage(raw);
    if (page === undefined || page === 1) return { title: 'Página no encontrada', robots: { index: false, follow: true } };
    return buildDealsMetadata(platform, page);
}

export default async function PaginatedPlatformDealsPage({ params }: Props) {
    const { platform, page: raw } = await params;
    const page = parseDealsPage(raw);
    if (page === undefined) notFound();
    if (page === 1) permanentRedirect(dealsPagePath(platform));
    return <DealsLanding slug={platform} page={page} />;
}
