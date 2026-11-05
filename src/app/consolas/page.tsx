import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONSOLES_PUBLIC, CONSOLES_VISIBILITY } from '@/lib/features';
import { getConsoles } from '@/lib/api';
import { ConsoleCatalog, ConsoleCatalogSkeleton } from '@/components/consoles/ConsoleCatalog';
import { StaffOnly } from '@/components/consoles/StaffOnly';
import { consoleQuery } from '@/lib/consoles';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
    if (CONSOLES_VISIBILITY === 'off') notFound();
    if (!CONSOLES_PUBLIC) return { title: 'Consolas (vista previa)', robots: { index: false, follow: false } };
    const params = await searchParams;
    return buildMetadata({ title: 'Consolas: compara precios y packs', path: '/consolas',
        description: 'Compara consolas Xbox, PlayStation y Nintendo por modelo, edición, almacenamiento y juegos incluidos.',
        noIndex: Object.keys(params).length > 0 });
}

export default async function ConsolesPage({ searchParams }: { searchParams: SearchParams }) {
    if (CONSOLES_VISIBILITY === 'off') notFound();
    const query = consoleQuery(await searchParams);
    if (!CONSOLES_PUBLIC) {
        // Staff preview: the server never sees the admin token, so it renders
        // only the gate and the browser loads the drafts with the token.
        return <StaffOnly placeholder={<ConsoleCatalogSkeleton />}>
            <ConsoleCatalog key={JSON.stringify(query)} initialData={null} initialQuery={query} preview />
        </StaffOnly>;
    }
    const data = await getConsoles(query, { revalidate }).catch(() => null);
    return <ConsoleCatalog key={JSON.stringify(query)} initialData={data} initialQuery={query} />;
}
