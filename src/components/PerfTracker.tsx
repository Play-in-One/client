'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

import { sendPageLoad, type PageLoadPayload } from '@/lib/api';
import { routePattern } from '@/lib/routePattern';
import { useConsent } from '@/context/ConsentContext';
import { PERF_ELEMENT_ID, type ServerPerfPayload } from './PerfBeacon';

/* Rutas de administración: tráfico propio, no de visitantes. Mismo criterio
   que `PageViewTracker`. */
const EXCLUDED = ['/staff'];

/* Cuánto puede haber pasado desde que se generó el HTML para seguir creyendo
   que los tiempos de servidor son de ESTA carga.

   Casi todas las páginas del sitio son ISR: en un acierto de caché no hay
   render y el JSON del servidor viaja horneado con los tiempos de la
   regeneración anterior. Pasado este margen se asume acierto de caché y se
   descarta `ssr_ms` en vez de atribuirle a esta carga el trabajo de otra. */
const FRESH_RENDER_MS = 5000;

interface Vitals {
    fcp_ms?: number;
    lcp_ms?: number;
    inp_ms?: number;
    cls?: number;
    ttfb_ms?: number;
}

function readServerPerf(): ServerPerfPayload | null {
    try {
        const el = document.getElementById(PERF_ELEMENT_ID);
        return el?.textContent ? (JSON.parse(el.textContent) as ServerPerfPayload) : null;
    } catch {
        return null;
    }
}

function navigationEntry(): PerformanceNavigationTiming | null {
    try {
        return (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming) ?? null;
    } catch {
        return null;
    }
}

/** Redondea a entero y descarta lo que no sea un número finito y positivo. */
function ms(value: number | undefined | null): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.round(value)
        : undefined;
}

/**
 * Mide cuánto tarda la página en cargar de verdad, en el dispositivo de quien
 * la visita, y lo manda UNA sola vez por carga.
 *
 * Se monta junto a `PageViewTracker` en el layout, así que cualquier página
 * nueva queda medida sin tocar este archivo.
 *
 * El envío se hace al ocultarse la página y no al cargar: LCP e INP no son
 * definitivos hasta entonces —el elemento más grande puede llegar tarde, y la
 * interacción más lenta puede ser la última—. Mandar antes daría cifras
 * sistemáticamente optimistas, que es peor que no medir.
 */
export default function PerfTracker() {
    const pathname = usePathname();
    // Igual que `PageViewTracker`: React corre los efectos de los hijos antes
    // que los del padre, así que sin esperar a `ready` el primer beacon saldría
    // antes de que ConsentContext hubiera leído la preferencia — sin
    // `visitor_id` y saltándose el opt-out.
    const { ready } = useConsent();

    const vitals = useRef<Vitals>({});
    const sent = useRef(false);
    // La ruta se congela al montar: si alguien navega antes de que la página se
    // oculte, el beacon debe seguir describiendo la carga que se midió, no la
    // página en la que acabó.
    const measuredPath = useRef<string | null>(null);

    useReportWebVitals((metric) => {
        // Redondeadas en origen: llegan con decimales (`108.5`) y el backend
        // las guarda como enteros. La fracción de milisegundo de un LCP no
        // significa nada y solo son bytes en el beacon.
        switch (metric.name) {
            case 'FCP': vitals.current.fcp_ms = ms(metric.value); break;
            case 'LCP': vitals.current.lcp_ms = ms(metric.value); break;
            case 'INP': vitals.current.inp_ms = ms(metric.value); break;
            case 'TTFB': vitals.current.ttfb_ms = ms(metric.value); break;
            // El único que no son milisegundos: es un desplazamiento acumulado,
            // decimal por naturaleza (0.02 es un valor normal).
            case 'CLS': vitals.current.cls = Math.round(metric.value * 1000) / 1000; break;
        }
    });

    const flush = useCallback(() => {
        if (sent.current || !ready) return;
        const path = measuredPath.current;
        if (!path) return;
        sent.current = true;

        const nav = navigationEntry();
        const server = readServerPerf();
        const fresh =
            server && Date.now() - Date.parse(server.rendered_at) < FRESH_RENDER_MS;

        const payload: PageLoadPayload = {
            page_path: path,
            ...vitals.current,
            // Sin identificador, el backend no puede añadir su mitad; la carga
            // se guarda igual con lo que midió el navegador.
            request_id: fresh ? server.nav_id : undefined,
            cache_state: server ? (fresh ? 'miss' : 'hit') : 'dynamic',
        };

        if (nav) {
            payload.nav_type = nav.type === 'back_forward' ? 'back_forward' : nav.type;
            payload.dns_ms = ms(nav.domainLookupEnd - nav.domainLookupStart);
            payload.tcp_ms = ms(nav.connectEnd - nav.connectStart);
            payload.tls_ms = nav.secureConnectionStart
                ? ms(nav.connectEnd - nav.secureConnectionStart)
                : undefined;
            payload.request_ms = ms(nav.responseStart - nav.requestStart);
            payload.response_ms = ms(nav.responseEnd - nav.responseStart);
            payload.ttfb_ms = payload.ttfb_ms ?? ms(nav.responseStart - nav.startTime);
            payload.dom_interactive_ms = ms(nav.domInteractive - nav.startTime);
            payload.dom_content_loaded_ms = ms(nav.domContentLoadedEventEnd - nav.startTime);
            payload.load_event_ms = ms(nav.loadEventEnd - nav.startTime);
        }

        const connection = (navigator as Navigator & {
            connection?: { effectiveType?: string };
        }).connection;
        if (connection?.effectiveType) payload.connection_type = connection.effectiveType;

        sendPageLoad(payload);
    }, [ready]);

    useEffect(() => {
        if (!pathname || measuredPath.current !== null) return;
        if (EXCLUDED.some((prefix) => pathname.startsWith(prefix))) return;
        measuredPath.current = routePattern(pathname);
    }, [pathname]);

    useEffect(() => {
        // `visibilitychange` a `hidden` es el único momento fiable: `unload` no
        // se dispara en móviles y `beforeunload` rompe el bfcache. `pagehide`
        // cubre a Safari, que puede saltarse el primero.
        const onHide = () => {
            if (document.visibilityState === 'hidden') flush();
        };
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', flush);
        return () => {
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', flush);
        };
    }, [flush]);

    return null;
}
