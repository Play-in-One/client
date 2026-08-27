'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/api';
import { useConsent } from '@/context/ConsentContext';

// Rutas de administración: son tráfico propio, no de visitantes, y ensuciarían
// el ranking de páginas.
const EXCLUDED = ['/staff'];

/**
 * Emite un `page_view` por cada navegación. Se monta una sola vez en el layout,
 * así que cualquier página nueva queda medida sin tocar este archivo.
 *
 * El backend normaliza la ruta a plantilla (`/blog/12` → `/blog/[id]`), de modo
 * que el ranking agrupa por tipo de página en vez de una fila por cada id.
 */
export default function PageViewTracker() {
    const pathname = usePathname();
    // React ejecuta los efectos de los hijos antes que los del padre, así que
    // sin esperar a `ready` el primer page_view de cada carga saldría antes de
    // que ConsentContext hubiera leído la cookie: cada visita empezaría con un
    // evento huérfano y su primera página no contaría como entrada de la visita.
    const { ready } = useConsent();
    // Sin este guard el evento se duplica: el efecto corre dos veces bajo
    // React StrictMode en dev y una vez más en cada re-render del layout.
    const lastPath = useRef<string | null>(null);

    useEffect(() => {
        if (!ready || !pathname || pathname === lastPath.current) return;
        if (EXCLUDED.some((prefix) => pathname.startsWith(prefix))) return;
        lastPath.current = pathname;
        trackEvent({ event_type: 'page_view', page_path: pathname });
    }, [pathname, ready]);

    return null;
}
