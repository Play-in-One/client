'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/api';

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
    // Sin este guard el evento se duplica: el efecto corre dos veces bajo
    // React StrictMode en dev y una vez más en cada re-render del layout.
    const lastPath = useRef<string | null>(null);

    useEffect(() => {
        if (!pathname || pathname === lastPath.current) return;
        if (EXCLUDED.some((prefix) => pathname.startsWith(prefix))) return;
        lastPath.current = pathname;
        trackEvent({ event_type: 'page_view', page_path: pathname });
    }, [pathname]);

    return null;
}
