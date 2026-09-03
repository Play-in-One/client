import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

/* Invalidación on-demand del caché ISR, llamada por el backend Django
   (signal post_save de Post / Game destacado) al publicar contenido, para
   que aparezca en segundos en vez de esperar el `revalidate = 300` de las
   páginas — que se mantiene como red de seguridad.

   POST /api/revalidate
   Header: x-revalidate-token: <REVALIDATE_TOKEN>
   Body opcional: { "paths": ["/", "/blog", "/blog/12"] }  (default: ["/", "/blog"])
*/

/* Solo rutas conocidas: evita que un token filtrado sirva para purgar rutas
   arbitrarias. Además de la home y el blog acepta las páginas cuyo contenido
   depende de los precios —la ficha de un juego, la de una tienda, el buscador y
   las landings por consola—, que antes quedaban fuera: un cambio de precio
   podía tardar hasta 5 minutos en verse y su dato estructurado seguía
   publicando la cifra vieja mientras tanto. */
const ALLOWED_PATH =
    /^\/$|^\/blog$|^\/blog\/\d+$|^\/search$|^\/juego\/[a-z0-9-]+$|^\/store\/\d+$|^\/juegos\/[a-z0-9-]+(\/pagina\/\d+)?$/;

function tokenMatches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
    const expected = process.env.REVALIDATE_TOKEN;
    // Fail closed: sin token configurado, el endpoint no existe a efectos prácticos.
    if (!expected) {
        return NextResponse.json({ error: 'Revalidation disabled' }, { status: 401 });
    }
    const provided = request.headers.get('x-revalidate-token') ?? '';
    if (!tokenMatches(provided, expected)) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    let requested: unknown;
    try {
        requested = (await request.json())?.paths;
    } catch {
        requested = undefined; // sin body o body inválido → defaults
    }
    const paths = Array.isArray(requested) && requested.length > 0
        ? requested.filter((p): p is string => typeof p === 'string' && ALLOWED_PATH.test(p))
        : ['/', '/blog'];

    if (paths.length === 0) {
        return NextResponse.json({ error: 'No valid paths' }, { status: 400 });
    }

    for (const path of paths) {
        revalidatePath(path);
    }
    return NextResponse.json({ revalidated: true, paths });
}
