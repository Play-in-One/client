import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import PlatformLanding, { buildLandingMetadata, landingPath } from '../../landing';

/**
 * Páginas interiores de una landing por consola: /juegos/ps5/pagina/2…
 *
 * Son el camino por el que un crawler recorre el catálogo entero. La paginación
 * de `/search` no sirve para eso: es `<button>` de Mantine dentro de un subárbol
 * con `useSearchParams()`, así que no existe en el HTML del servidor, y encima
 * cualquier query param vuelve esa ruta `noindex`.
 *
 * En la URL va `pagina` y no `page` porque el resto de rutas públicas están en
 * español y la URL es contenido indexable como cualquier otro.
 *
 * NO hay `generateStaticParams`: son ~410 páginas entre todas las consolas y
 * prerenderizarlas en el build lo alargaría por nada. Se generan bajo demanda y
 * quedan cacheadas por el mismo ISR que la landing.
 */

export const revalidate = 300;

/** `undefined` si el segmento no es un entero ≥ 1: `/pagina/abc` no existe. */
function parsePage(raw: string): number | undefined {
    return /^[1-9]\d*$/.test(raw) ? Number(raw) : undefined;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; page: string }>;
}): Promise<Metadata> {
    const { slug, page } = await params;
    const n = parsePage(page);
    if (n === undefined || n === 1) {
        // La 1 no se sirve aquí (redirige), pero la metadata se evalúa igual.
        return { title: 'Página no encontrada', robots: { index: false, follow: true } };
    }
    return buildLandingMetadata(slug, n);
}

export default async function PlatformLandingPaginatedPage({
    params,
}: {
    params: Promise<{ slug: string; page: string }>;
}) {
    const { slug, page } = await params;
    const n = parsePage(page);
    if (n === undefined) notFound();
    // `/pagina/1` es la landing con otra URL: dos URLs con el mismo contenido.
    // Se resuelve con un 308 y no con un canonical para que solo exista una.
    if (n === 1) permanentRedirect(landingPath(slug, 1));

    return <PlatformLanding slug={slug} page={n} />;
}
