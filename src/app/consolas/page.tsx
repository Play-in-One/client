import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONSOLES_ENABLED } from '@/lib/features';
import { getConsoles } from '@/lib/api';
import { ConsoleCatalog } from '@/components/consoles/ConsoleBrowser';
import { consoleQuery } from '@/lib/consoles';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
    if (!CONSOLES_ENABLED) notFound();
    const params = await searchParams;
    return buildMetadata({ title: 'Consolas: compara precios y packs', path: '/consolas',
        description: 'Compara consolas Xbox, PlayStation y Nintendo por modelo, edición, almacenamiento y juegos incluidos.',
        noIndex: Object.keys(params).length > 0 });
}

export default async function ConsolesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    if (!CONSOLES_ENABLED) notFound();
    const query = consoleQuery(await searchParams);
    const data = await getConsoles(query, { revalidate }).catch(() => null);
    return <ConsoleCatalog key={JSON.stringify(query)} initialData={data} initialQuery={query} />;
}
