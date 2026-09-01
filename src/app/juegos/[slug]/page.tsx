import type { Metadata } from 'next';
import { getPlatforms } from '@/lib/api';
import PlatformLanding, { buildLandingMetadata } from './landing';

/**
 * Landing por consola: /juegos/ps5, /juegos/switch, /juegos/pc…
 *
 * Existe porque `/search?platform=ps5` va `noindex` (cualquier permutación de
 * filtros lo está, para no indexar mil variantes del mismo catálogo) y además
 * se renderizaba entero en el cliente. Los enlaces de consola del Navbar y el
 * Footer apuntaban ahí, así que el sitio no tenía ni una página indexable para
 * "juegos de PS5 baratos" — que es la búsqueda real.
 *
 * La ruta es `/juegos/[slug]` y no `/consola/[slug]` porque así la URL contiene
 * la consulta ("juegos ps5") y porque `pc` no es una consola.
 *
 * Esto es la página 1; de la 2 en adelante viven en `pagina/[page]`. Las dos
 * comparten cuerpo en `./landing`.
 */

export const revalidate = 300;

/** Prerenderiza una landing por consola. Son pocas y estables. */
export async function generateStaticParams() {
    try {
        const res = await getPlatforms();
        return res.results.map((p) => ({ slug: p.slug }));
    } catch {
        // Sin backend en el build no se prerenderiza ninguna: se generan
        // bajo demanda en la primera visita.
        return [];
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    return buildLandingMetadata(slug, 1);
}

export default async function PlatformLandingPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    return <PlatformLanding slug={slug} page={1} />;
}
