'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';
import {
    getPendingNavigation, samePath, seedMatches, settleSeededNavigation, usePendingNavigation,
} from '@/lib/navigationSeed';

/* El overlay de la ficha instantánea solo existe tras un clic en una tarjeta:
   no entra en el bundle inicial (ver `usePreloadOverlay`). */
const loadOverlay = () => import('./InstantDetailOverlay');
const InstantDetailOverlay = dynamic(loadOverlay, { ssr: false });

let overlayPreloaded = false;
/** Baja el código del overlay sin bloquear nada; idempotente. */
function preloadInstantOverlay(): void {
    if (overlayPreloaded) return;
    overlayPreloaded = true;
    void loadOverlay();
}

const DETAIL_LINK = 'a[href^="/juego/"], a[href^="/consola/"], a[href^="/blog/"]';

/** Precarga el overlay cuando hace falta: al primer gesto sobre una tarjeta
 *  (hover, toque o foco, que llegan antes del clic) y, si no, en un momento
 *  ocioso tras la carga. Nada de esto compite con el LCP. Sin ahorro de datos
 *  activado, que pide no bajar nada que no se haya pedido. */
function usePreloadOverlay() {
    useEffect(() => {
        const onIntent = (event: Event) => {
            if (event.target instanceof Element && event.target.closest(DETAIL_LINK)) {
                preloadInstantOverlay();
                stop();
            }
        };
        const events = ['pointerover', 'touchstart', 'focusin'] as const;
        const stop = () => events.forEach((type) => document.removeEventListener(type, onIntent, true));
        events.forEach((type) => document.addEventListener(type, onIntent, { capture: true, passive: true }));
        const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
        const idle = saveData ? undefined : window.setTimeout(() => {
            if ('requestIdleCallback' in window) window.requestIdleCallback(preloadInstantOverlay, { timeout: 5000 });
            else preloadInstantOverlay();
        }, 4000);
        return () => {
            stop();
            if (idle !== undefined) window.clearTimeout(idle);
        };
    }, []);
}

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
 * ve un crawler no cambia.
 *
 * Ficha instantánea (ver `lib/navigationSeed.ts`): tras el clic en una tarjeta,
 * mientras la URL sigue siendo la de origen, el overlay tapa la página con la
 * ficha pintada desde la tarjeta. Va como HERMANO del div con key, no dentro:
 * `.view-fade` anima `transform`, y un padre transformado atraparía a un hijo
 * `position: fixed`. Cuando la ruta cambia y es la de la semilla, la vista
 * nueva NO repite el fade: el overlay ya entró con el suyo y la ficha aparece
 * en su mismo sitio. */
export default function ViewTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const pending = usePendingNavigation();
    const fade = useRef<{ pathname: string; className?: string }>({ pathname });

    // La clase se decide UNA vez por pathname: añadirla después de montar
    // reiniciaría la animación.
    if (pathname !== fade.current.pathname) {
        fade.current = {
            pathname,
            className: pending && seedMatches(pending.seed, pathname) ? undefined : 'view-fade',
        };
    }

    const overlay = pending && samePath(pathname, pending.fromPathname) ? pending : null;
    usePreloadOverlay();

    useLayoutEffect(() => {
        const seeded = getPendingNavigation();
        // La ficha de la semilla tiene que quedar donde el overlay la pintó,
        // con el documento arriba. Next solo sube el scroll si el inicio de la
        // página nueva quedó fuera de la pantalla: con la galería apenas
        // bajada, la ficha aparecía unos píxeles más arriba que el overlay.
        if (seeded && !samePath(pathname, seeded.fromPathname) && seedMatches(seeded.seed, pathname)) {
            window.scrollTo(0, 0);
        }
        settleSeededNavigation(pathname);
    }, [pathname]);

    return (
        <>
            <div key={pathname} className={fade.current.className}
                inert={overlay ? true : undefined} aria-hidden={overlay ? true : undefined}>
                {children}
            </div>
            {overlay && <InstantDetailOverlay pending={overlay} />}
        </>
    );
}
