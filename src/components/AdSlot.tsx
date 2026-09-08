'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Box, Container, Text } from '@mantine/core';

import { useConsent } from '@/context/ConsentContext';
import { ADSENSE_CLIENT } from '@/lib/ads';

declare global {
    interface Window {
        adsbygoogle?: Record<string, unknown>[] & { requestNonPersonalizedAds?: 0 | 1 };
    }
}

/* Alto reservado, en px. `data-ad-format="horizontal"` acota el anuncio a la
   familia 320x100 / 728x90 / 970x90, así que 100 cubre el caso alto y el hueco
   no cambia de tamaño cuando el anuncio llega. El proyecto mide Core Web
   Vitals reales (ver PerfTracker): un salto aquí sale en las cifras. */
const RESERVED_HEIGHT = 100;

/**
 * Un bloque de Google AdSense.
 *
 * Tres cosas lo distinguen de pegar el `<ins>` de la documentación:
 *
 * 1. **No carga nada hasta que el hueco se acerca al viewport.** `adsbygoogle.js`
 *    son ~100 KB y varias subpeticiones; el bloque vive al fondo de la ficha, y
 *    un anuncio fuera de pantalla no cuenta como impresión de todos modos.
 * 2. **Espera al `ready` del consentimiento**, como todo tracker del proyecto.
 *    React corre los efectos de los hijos antes que los del padre: sin esperar,
 *    se pediría anuncio personalizado a quien todavía no ha dicho nada.
 * 3. **El alto está reservado desde el primer render**, llene o no llene.
 *
 * Sin `NEXT_PUBLIC_ADSENSE_CLIENT` o sin `slot` devuelve `null` y no queda ni
 * el hueco: así en local no aparece nada.
 *
 * `allowed` admite dos formas, y la diferencia no es un capricho:
 *
 * - **Un booleano** en las páginas dinámicas (la ficha de juego), donde el
 *   servidor ya leyó `CF-IPCountry` y sabe si toca anuncio. Sale gratis y,
 *   cuando la respuesta es que no, la página no emite ni el hueco.
 * - **Omitido** en las páginas ESTÁTICAS (la home). Su HTML es un documento
 *   cacheado y compartido: una decisión por país tomada en el servidor se
 *   hornearía en esa caché y se le serviría al país equivocado. Ahí el país lo
 *   resuelve el navegador contra `/api/geo`, y el hueco se reserva igual
 *   mientras tanto — a quien no le toque anuncio le queda un espacio en blanco,
 *   que es preferible a mover la página bajo el cursor.
 */
export default function AdSlot({
    slot,
    allowed,
    label = 'Publicidad',
}: {
    slot: string;
    allowed?: boolean;
    label?: string;
}) {
    const { ready, adsPersonalized } = useConsent();
    const holder = useRef<HTMLDivElement>(null);
    const ins = useRef<HTMLModElement>(null);
    const pushed = useRef(false);
    const [near, setNear] = useState(false);
    const [filled, setFilled] = useState(false);
    /* `null` = todavía no se sabe (solo en páginas estáticas, hasta que
       responda /api/geo). Nunca se pide anuncio con este valor. */
    const [geoAllowed, setGeoAllowed] = useState<boolean | null>(allowed ?? null);

    /** Hay con qué pedir un anuncio, aunque quizá no a esta persona. */
    const configured = Boolean(ADSENSE_CLIENT && slot);
    const enabled = configured && geoAllowed === true;

    /* El país solo se pregunta cuando el hueco ya está cerca: si nadie baja
       hasta aquí, no se gasta ni esta petición. Los errores caen del lado
       prudente —sin anuncio— porque servirlo en el EEE sin CMP es el fallo
       caro, y no verlo en Chile solo cuesta una impresión. */
    useEffect(() => {
        if (!configured || !near || allowed !== undefined) return;
        const controller = new AbortController();
        fetch('/api/geo', { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : { ads: false }))
            .then((data) => setGeoAllowed(data.ads === true))
            .catch(() => {
                if (!controller.signal.aborted) setGeoAllowed(false);
            });
        return () => controller.abort();
    }, [configured, near, allowed]);

    useEffect(() => {
        if (!configured) return;
        const node = holder.current;
        if (!node) return;
        // Sin IntersectionObserver (navegador viejo) se carga sin más: es
        // preferible a no servir nunca el anuncio.
        if (typeof IntersectionObserver === 'undefined') {
            setNear(true);
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                setNear(true);
                observer.disconnect();
            },
            // Con margen: el anuncio tiene que estar pedido ANTES de que el
            // hueco entre en pantalla, o se ve el rectángulo vacío.
            { rootMargin: '400px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [configured]);

    useEffect(() => {
        if (!enabled || !near || !ready || pushed.current || !ins.current) return;

        const queue = (window.adsbygoogle = window.adsbygoogle ?? []);
        /* Tiene que estar puesto ANTES de que la librería arranque: es una
           propiedad del array-cola, y AdSense la lee al inicializarse. Quien no
           ha decidido nada cae en 1 — anuncio sin personalizar. Si acepta
           después, se aplicará en la siguiente página: volver a pedir sobre un
           `<ins>` ya resuelto lanza TagError. */
        queue.requestNonPersonalizedAds = adsPersonalized ? 0 : 1;
        try {
            queue.push({});
            pushed.current = true;
        } catch {
            /* Un anuncio que no carga no puede tumbar la ficha. */
        }
    }, [enabled, near, ready, adsPersonalized]);

    /* AdSense escribe `data-ad-status="filled" | "unfilled"` en el `<ins>`. La
       etiqueta "Publicidad" solo aparece cuando hay algo que etiquetar, y lo
       hace con opacidad para no mover ni un píxel: sobre un hueco vacío esa
       palabra sobra, pero ocultarla reservando su espacio evita el salto. */
    useEffect(() => {
        const node = ins.current;
        if (!enabled || !near || !node) return;
        const check = () => setFilled(node.getAttribute('data-ad-status') === 'filled');
        check();
        const observer = new MutationObserver(check);
        observer.observe(node, { attributes: true, attributeFilter: ['data-ad-status'] });
        return () => observer.disconnect();
    }, [enabled, near]);

    /* El contenedor y su aire viven DENTRO del componente: si el bloque no
       aplica, la página no queda con un hueco vacío al fondo.

       Se sale por `allowed === false` —el servidor ya dijo que no— pero NO por
       `geoAllowed === false`, que es la misma negativa llegando tarde desde
       /api/geo: para entonces el hueco ya está pintado, y quitarlo movería la
       página. Se queda en blanco, que cuesta menos. */
    if (!configured || allowed === false) return null;

    return (
        <Container
            ref={holder}
            component="aside"
            size="lg"
            pb={60}
            aria-label={label}
            data-ad-slot-holder
        >
            <Text
                fz="xs"
                c="dimmed"
                ta="center"
                mb={4}
                aria-hidden={!filled}
                style={{ opacity: filled ? 1 : 0, transition: 'opacity 150ms' }}
            >
                {label}
            </Text>
            {/* El alto está en el Box, no en el `<ins>`: así el hueco mide lo
                mismo antes y después de saberse el país, y el anuncio puede
                aparecer sin mover nada. */}
            <Box mih={RESERVED_HEIGHT} style={{ overflow: 'hidden' }}>
                {enabled && (
                    <ins
                        ref={ins}
                        className="adsbygoogle"
                        style={{ display: 'block', minHeight: RESERVED_HEIGHT }}
                        data-ad-client={ADSENSE_CLIENT}
                        data-ad-slot={slot}
                        data-ad-format="horizontal"
                        /* `false` a propósito: en true el anuncio se va a ancho
                           completo en móvil y su alto deja de ser predecible,
                           que es justo lo que el hueco reservado intenta
                           evitar. */
                        data-full-width-responsive="false"
                    />
                )}
            </Box>
            {enabled && near && (
                <Script
                    id="adsbygoogle-loader"
                    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
                    strategy="lazyOnload"
                    crossOrigin="anonymous"
                />
            )}
        </Container>
    );
}
