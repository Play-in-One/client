import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGames, getSeller } from '@/lib/api';
import type { Game, Seller } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, storeJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { formatCLP } from '@/lib/utils';
import StoreClient from './StoreClient';

// El catálogo de la tienda cambia con cada scrapeo; 5 minutos lo mantiene
// fresco sin pagar el fetch en cada visita.
export const revalidate = 300;

// Vacío a propósito: sin `generateStaticParams` Next trata la ruta como
// dinámica e ignora `revalidate` (renderizaba cada petición, `no-store`). Con
// la lista vacía nada se prerenderiza en el build y cada tienda se cachea
// tras su primera visita.
export function generateStaticParams(): { id: string }[] {
    return [];
}

async function fetchSeller(id: string): Promise<Seller | null> {
    try {
        return await getSeller(id);
    } catch {
        return null;
    }
}

/** Primera página del catálogo de la tienda. Ya no se renderiza —la galería se
 *  retiró de la vista—, pero se sigue pidiendo para armar la frase de la ficha:
 *  cuántos juegos tiene la tienda y cuál es el más barato. Es lo que convierte
 *  la meta description en una respuesta y no en una plantilla. */
async function fetchGames(id: string): Promise<{ games: Game[]; total: number }> {
    try {
        const res = await getGames({ seller: Number(id), ordering: 'min_price' });
        return { games: res.results, total: res.count };
    } catch {
        // La ficha de la tienda vale por sí sola: si el catálogo falla se
        // renderiza sin él en vez de tumbar la página entera.
        return { games: [], total: 0 };
    }
}

/** "En Zmart comparamos 412 juegos; el más barato es X a $9.990." */
function storeSummary(seller: Seller, games: Game[], total: number): string | null {
    if (total === 0) return null;
    const cheapest = games.find((g) => g.min_price != null);
    const shipping = parseFloat(seller.shipping_cost ?? '0');
    const shippingNote = shipping > 0
        ? ` Sus precios se muestran con un envío promedio de ${formatCLP(shipping)} ya incluido.`
        : ' Sus precios se muestran sin costo de envío añadido.';
    const label = total === 1 ? '1 videojuego' : `${total} videojuegos`;
    const head = `En ${seller.name} comparamos ${label}`;
    return cheapest
        ? `${head}; el más barato ahora es ${cheapest.name} a ${formatCLP(cheapest.min_price!)}.${shippingNote}`
        : `${head}.${shippingNote}`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const seller = await fetchSeller(id);
    if (!seller) return buildMetadata({ title: 'Tienda no encontrada', noIndex: true });

    const { games, total } = await fetchGames(id);
    const description =
        storeSummary(seller, games, total) ||
        seller.description?.trim() ||
        `Ofertas y precios de videojuegos en ${seller.name}. Compara con otras tiendas chilenas en Play in One.`;

    return buildMetadata({
        // La intención que puede ganar la ficha es "precios en <tienda>", no el
        // nombre a secas (eso lo gana la propia tienda).
        title: `${seller.name}: precios y catálogo de videojuegos`,
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

    const { games, total } = await fetchGames(id);
    const summary = storeSummary(seller, games, total);

    // Sin ItemList ni CollectionPage: la galería se retiró de la vista y un
    // ItemList habría seguido enumerando un catálogo que la página ya no
    // muestra — exactamente el desajuste entre dato estructurado y contenido
    // que penalizan los buscadores. El Store se queda: describe a la tienda,
    // que es lo que la ficha sigue mostrando.
    const jsonLd = [
        storeJsonLd(seller),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Tiendas', path: '/search' },
            { name: seller.name, path: `/store/${seller.id}` },
        ]),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <StoreClient initialSeller={seller} summary={summary} />
        </>
    );
}
