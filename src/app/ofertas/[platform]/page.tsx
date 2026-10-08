import type { Metadata } from 'next';
import DealsLanding, { buildDealsMetadata } from '../DealsLanding';

/**
 * /ofertas/<consola> — las ofertas del día de una consola. Un slug que no está
 * en el catálogo es 404; una consola real sin ofertas hoy responde 200 con el
 * estado vacío y `noindex`.
 */
export const revalidate = 3600;

/**
 * Vacío a propósito, pero tiene que existir: sin la función Next trata la ruta
 * como dinámica e ignora `revalidate`, y cada visita se renderizaría por
 * petición (pasó con la paginación de las landings). Con la lista vacía nada se
 * prerenderiza en el build —que no ve la API— y cada consola se cachea tras su
 * primera visita.
 */
export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ platform: string }>;
}): Promise<Metadata> {
    const { platform } = await params;
    return buildDealsMetadata(platform);
}

export default async function PlatformDealsPage({
    params,
}: {
    params: Promise<{ platform: string }>;
}) {
    const { platform } = await params;
    return <DealsLanding slug={platform} />;
}
