'use client';

import { Loader } from '@mantine/core';
import { useLinkStatus } from 'next/link';
import { onDark, scrim } from '@/lib/colors';

/**
 * Velo con spinner sobre la portada de una tarjeta mientras abre su ficha: la
 * señal de que el clic se registró aunque la respuesta todavía no llegue.
 *
 * La ficha no se precarga (`GAME_LINK_PREFETCH` en `lib/seo.ts`), así que entre
 * el clic y el esqueleto hay siempre un viaje de ida y vuelta al servidor, y
 * en una red móvil lenta puede ser largo. Sin el velo la pantalla no cambia
 * —ni la URL— durante ese tiempo, y la tarjeta parece muerta.
 *
 * Va DENTRO del `<Link>`: `useLinkStatus` lee el contexto que abre el Link, y
 * fuera de él nunca está pendiente. El padre debe tener `position: relative`.
 * Aparece con retraso (`.link-pending` en `globals.css`) para no parpadear en
 * una navegación rápida.
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
