'use client';

import { usePathname } from 'next/navigation';
import { useRef } from 'react';

/* Fade de entrada al cambiar de vista.
 *
 * Se salta en la PRIMERA carga a propósito: arrancar el contenido en
 * `opacity: 0` retrasa el LCP —Chrome no cuenta como pintado lo que está
 * transparente— y aquí se cuida la métrica. Solo anima al navegar.
 *
 * La key es el pathname y NO la URL completa: `/search` empuja sus filtros a la
 * query string, así que con la query dentro de la key cada clic en un filtro
 * remontaría los resultados y repetiría el fade.
 *
 * `usePathname` es seguro; `useSearchParams` NO lo sería: saca a todo su
 * subárbol del render del servidor. `children` llega como prop desde el layout
 * servidor, así que las páginas siguen siendo Server Components y el HTML que
 * ve un crawler no cambia. */
export default function ViewTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const initialPathname = useRef(pathname);
    const hasNavigated = useRef(false);

    if (pathname !== initialPathname.current) {
        hasNavigated.current = true;
    }

    return (
        <div key={pathname} className={hasNavigated.current ? 'view-fade' : undefined}>
            {children}
        </div>
    );
}
