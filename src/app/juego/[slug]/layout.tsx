import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { gamePath } from '@/lib/seo';
import { RSC_REQUEST_HEADER } from '@/lib/rscRequest';
import { fetchGamePreview, parseGameSegment, startGameFetch } from './resolve';

/**
 * Decide el STATUS de la ficha antes de que salga el primer byte.
 *
 * `loading.tsx` (necesario para que el clic pinte el esqueleto sin esperar al
 * backend) abre un boundary de streaming alrededor del page: la respuesta ya
 * viajó como 200 cuando el page llama a `notFound()` o `permanentRedirect()`,
 * y Google recibía un "soft 404" con noindex o una redirección por meta
 * refresh. El layout se renderiza FUERA de ese boundary, así que lo que se
 * lanza aquí es un 404 o un 308 de verdad.
 *
 * Solo hace falta en un DOCUMENTO. En una petición RSC —la navegación del
 * cliente o un prefetch— el status no lo mira nadie: el router resuelve el
 * `notFound()` y el `permanentRedirect()` del page dentro del stream. Esperar
 * aquí al backend en RSC bloqueaba el esqueleto hasta tener el detalle del
 * juego (0,5-7 s en frío en producción): el clic no cambiaba ni la URL.
 *
 * La metadata no pasa por aquí: Next 15.5 la renderiza en toda respuesta RSC,
 * prefetch incluido. Tanto ella como este layout usan la lectura ligera;
 * las ofertas y los históricos se resuelven dentro del boundary de la página.
 *
 * La marca la pone el middleware (`lib/rscRequest.ts`): `headers()` no ve
 * `rsc` ni `next-router-prefetch`, y por eso la comprobación anterior, que
 * miraba `next-router-prefetch`, nunca se cumplía. Falsificar la marca en un
 * documento solo le sirve a quien la manda su propia respuesta en streaming:
 * la ficha es `no-store`, nadie la cachea.
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
    // La lectura lenta arranca ya, en paralelo al preview (ver `startGameFetch`).
    startGameFetch(parsed.id);

    const isRsc = (await headers()).get(RSC_REQUEST_HEADER) === '1';
    if (!isRsc) {
        const game = await fetchGamePreview(parsed.id);
        if (!game) notFound();
        if (parsed.slug !== game.slug) permanentRedirect(gamePath(game));
    }

    return children;
}
