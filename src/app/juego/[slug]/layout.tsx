import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { gamePath } from '@/lib/seo';
import { fetchGame, parseGameSegment } from './resolve';

/**
 * Decide el STATUS de la ficha antes de que salga el primer byte.
 *
 * `loading.tsx` (necesario para que el prefetch de esta ruta dinámica pinte
 * algo al hacer clic) abre un boundary de streaming alrededor del page: la
 * respuesta ya viajó como 200 cuando el page llama a `notFound()` o
 * `permanentRedirect()`, y Google recibía un "soft 404" con noindex o una
 * redirección por meta refresh. El layout se renderiza FUERA de ese boundary,
 * así que lo que se lanza aquí es un 404 o un 308 de verdad.
 *
 * En una petición de prefetch (`next-router-prefetch: 1`) Next solo pide el
 * cascarón hasta `loading.tsx`; se salta la consulta para no pagar una llamada
 * a la API por cada tarjeta que entra en el viewport de la galería. La
 * navegación real vuelve a pasar por aquí. El page repite el mismo `getGame`:
 * Next memoiza el fetch dentro de la petición, así que solo se hace una vez.
 *
 * Un layout no ve `searchParams`: la redirección por slug desactualizado
 * pierde el `?platform=`. Es el caso raro (nombre corregido tras indexarse);
 * `/game/<id>?platform=` llega ya con el slug correcto y no pasa por aquí.
 */
export default async function GameSegmentLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const parsed = parseGameSegment((await params).slug);
    if (!parsed) notFound();

    const isPrefetch = (await headers()).get('next-router-prefetch') === '1';
    if (!isPrefetch) {
        const game = await fetchGame(parsed.id);
        if (!game) notFound();
        if (parsed.slug !== game.slug) permanentRedirect(gamePath(game));
    }

    return children;
}
