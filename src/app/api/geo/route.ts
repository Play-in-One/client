import { NextResponse, type NextRequest } from 'next/server';

import { adsAllowedForCountry } from '@/lib/ads';

/* GET /api/geo → { ads: boolean }
 *
 * Existe solo por las páginas ESTÁTICAS. La ficha de juego es dinámica y
 * resuelve el país en el servidor sin coste (ver `juego/[slug]/page.tsx`), pero
 * la home es ISR: su HTML es un único documento cacheado que se sirve igual a
 * todo el mundo. Ahí la decisión no puede tomarse en el servidor —quedaría
 * horneada en la caché compartida y se le serviría al país equivocado—, así que
 * la toma el navegador preguntando aquí.
 *
 * Un route handler es dinámico por naturaleza y NO arrastra a la página que lo
 * consume: la home sigue siendo estática con su `revalidate`.
 *
 * No revela nada: dice si se pueden servir anuncios, no dónde está nadie.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const ads = adsAllowedForCountry(request.headers.get('cf-ipcountry'));
    return NextResponse.json(
        { ads },
        // Sin caché en ningún salto: la respuesta depende de quién pregunta, y
        // una intermedia cacheada le daría a un europeo la de un chileno.
        { headers: { 'Cache-Control': 'no-store, private' } },
    );
}
