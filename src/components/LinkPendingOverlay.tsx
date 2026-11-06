'use client';

import { Loader } from '@mantine/core';
import { useLinkStatus } from 'next/link';
import { onDark, scrim } from '@/lib/colors';

/**
 * Velo con spinner sobre la portada de una tarjeta mientras abre su ficha: la
 * señal de que el clic se registró aunque la respuesta todavía no llegue.
 *
 * Sin él, un clic en una tarjeta cuyo prefetch aún no había vuelto no cambiaba
 * nada en pantalla —ni la URL— hasta que el servidor respondía, y la tarjeta
 * parecía muerta. Pasa sobre todo en móvil, donde se toca una tarjeta recién
 * entrada al viewport.
 *
 * Va DENTRO del `<Link>`: `useLinkStatus` lee el contexto que abre el Link, y
 * fuera de él nunca está pendiente. El padre debe tener `position: relative`.
 * Aparece con retraso (`.link-pending` en `globals.css`) para no parpadear en
 * una navegación que ya llega prefetcheada.
 */
export default function LinkPendingOverlay() {
    const { pending } = useLinkStatus();
    if (!pending) return null;
    return (
        <div data-link-pending aria-hidden className="link-pending" style={{ background: scrim.soft }}>
            <Loader size="sm" color={onDark.text} />
        </div>
    );
}
