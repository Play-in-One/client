import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { CONSOLES_ENABLED } from '@/lib/features';
import { ApiError, getConsole } from '@/lib/api';
import { ConsoleDetailBrowser } from '@/components/consoles/ConsoleBrowser';
import { JsonLd } from '@/components/JsonLd';
import { configurationLabel, consolePath, consoleQuery, consoleQueryString, type ConsoleQuery } from '@/lib/consoles';
import { absoluteUrl, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';

export const revalidate = 300;

const resolve = cache(async (slug: string, encodedQuery: string) => {
    if (!CONSOLES_ENABLED) notFound();
    const id = /(?:^|-)([1-9]\d*)$/.exec(slug)?.[1];
    if (!id || !Number.isSafeInteger(Number(id))) notFound();
    try {
        return await getConsole(id, JSON.parse(encodedQuery) as ConsoleQuery, { revalidate });
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        throw error;
    }
});

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const query = consoleQuery(await searchParams);
    const model = await resolve((await params).slug, JSON.stringify(query));
    return buildMetadata({ title: `${model.name}: precios, ediciones y packs`, path: consolePath(model), image: model.image,
        description: `Compara ${model.name} entre tiendas por edición, almacenamiento y juego incluido.`,
        noIndex: Object.keys(query).length > 0 });
}

export default async function ConsolePage({ params, searchParams }: Props) {
    const { slug } = await params;
    const query = consoleQuery(await searchParams);
    const model = await resolve(slug, JSON.stringify(query));
    const path = consolePath(model);
    if (`/consola/${slug}` !== path) permanentRedirect(`${path}${consoleQueryString(query)}`);
    const configurations = new Map(model.configurations.map(c => [c.id, c]));
    // Each offer describes its exact pack. Do not advertise one configuration's price for another.
    const offers = model.products.filter(p => p.in_stock && Number(p.current_price) > 0).map(p => ({
        '@type': 'Offer', name: `${model.name} · ${configurations.has(p.configuration ?? 0) ? configurationLabel(configurations.get(p.configuration ?? 0)!) : p.title}`,
        price: p.current_price, priceCurrency: 'CLP', availability: 'https://schema.org/InStock',
        itemCondition: p.condition === 'used' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
        url: absoluteUrl(`/go/product/${p.id}`), seller: { '@type': 'Organization', name: p.seller.name },
    }));
    const jsonLd = [{ '@context': 'https://schema.org', '@type': 'Product', name: model.name,
        description: model.description || `${model.name}: compara configuraciones y precios.`,
        url: absoluteUrl(path), ...(model.image ? { image: model.image } : {}), ...(offers.length ? { offers } : {}),
    }, breadcrumbJsonLd([{ name: 'Inicio', path: '/' }, { name: 'Consolas', path: '/consolas' }, { name: model.name, path }])];
    return <><JsonLd data={jsonLd} /><ConsoleDetailBrowser key={JSON.stringify(query)} initialData={model} initialQuery={query} /></>;
}
