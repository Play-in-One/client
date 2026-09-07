import { ADSENSE_CLIENT } from '@/lib/ads';

/* ads.txt — el estándar de IAB con el que un sitio declara quién puede vender
 * su inventario publicitario. Sin él, Google recorta el relleno y los
 * compradores automatizados desconfían.
 *
 * Va como route handler y no como `public/ads.txt` por una razón práctica: el
 * ID de editor ya vive en una sola variable, y un fichero estático obligaría a
 * mantener el mismo `ca-pub-` copiado en dos sitios que se pueden desincronizar
 * sin que nadie lo note.
 *
 * Sin el ID configurado responde 404, que es lo correcto: un ads.txt con un
 * marcador de posición dentro es peor que no tener ninguno.
 */
export const dynamic = 'force-static';

/* Identificador de Google en el sistema de ads.txt. Es una constante pública
 * del propio Google, igual para todos los editores. */
const GOOGLE_TAG_ID = 'f08c47fec0942fa0';

export async function GET() {
    if (!ADSENSE_CLIENT) {
        return new Response('Not found', { status: 404 });
    }

    // El formato exige `pub-…` sin el prefijo `ca-` que lleva el ID en el
    // código del anuncio. Es el error clásico que deja el fichero inválido.
    const publisherId = ADSENSE_CLIENT.replace(/^ca-/, '');

    return new Response(`google.com, ${publisherId}, DIRECT, ${GOOGLE_TAG_ID}\n`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
