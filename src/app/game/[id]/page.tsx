import { notFound, permanentRedirect } from 'next/navigation';
import { ApiError, getGame } from '@/lib/api';
import { gamePath } from '@/lib/seo';

/**
 * Ruta antigua de la ficha (`/game/<id>`): solo redirige, con 308, a
 * `/juego/<slug>-<id>`. Existe porque Google ya había descubierto ~10.000 de
 * estas URLs y porque hay enlaces compartidos con ellas; la redirección
 * permanente traspasa lo indexado a la nueva.
 *
 * Sin `loading.tsx` aquí a propósito: con un boundary delante la respuesta
 * saldría como 200 antes de decidir la redirección.
 */
export default async function LegacyGameRedirect({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ platform?: string | string[] }>;
}) {
    const { id } = await params;
    if (!/^\d+$/.test(id)) notFound();

    let game;
    try {
        game = await getGame(id);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) notFound();
        throw err;
    }
    const { platform } = await searchParams;
    permanentRedirect(gamePath(game, Array.isArray(platform) ? platform[0] : platform));
}
