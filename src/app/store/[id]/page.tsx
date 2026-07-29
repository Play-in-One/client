import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSeller } from '@/lib/api';
import type { Seller } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, storeJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import StoreClient from './StoreClient';

async function fetchSeller(id: string): Promise<Seller | null> {
    try {
        return await getSeller(id);
    } catch {
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const seller = await fetchSeller(id);
    if (!seller) return buildMetadata({ title: 'Tienda no encontrada', noIndex: true });

    const description =
        seller.description?.trim() ||
        `Ofertas y precios de videojuegos en ${seller.name}. Compara con otras tiendas chilenas en Play in One.`;

    return buildMetadata({
        title: seller.name,
        description,
        path: `/store/${seller.id}`,
        image: seller.logo,
    });
}

export default async function StoreDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const seller = await fetchSeller(id);
    if (!seller) notFound();

    const jsonLd = [
        storeJsonLd(seller),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: seller.name, path: `/store/${seller.id}` },
        ]),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <StoreClient initialSeller={seller} />
        </>
    );
}
