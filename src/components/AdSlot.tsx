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
 * Sin `NEXT_PUBLIC_ADSENSE_CLIENT`, sin `slot` o fuera de zona (`allowed`)
 * devuelve `null` y no queda ni el hueco: así en local no aparece nada.
 */
export default function AdSlot({
    slot,
    allowed,
    label = 'Publicidad',
}: {
    slot: string;
    allowed: boolean;
    label?: string;
}) {
    const { ready, adsPersonalized } = useConsent();
    const holder = useRef<HTMLDivElement>(null);
    const ins = useRef<HTMLModElement>(null);
    const pushed = useRef(false);
    const [near, setNear] = useState(false);
    const [filled, setFilled] = useState(false);

    const enabled = Boolean(ADSENSE_CLIENT && slot && allowed);

    useEffect(() => {
        if (!enabled) return;
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
    }, [enabled]);

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

    // El contenedor y su aire viven DENTRO del componente: si el bloque no
    // aplica, la página no queda con un hueco vacío de 60px al fondo.
    if (!enabled) return null;

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
            <Box mih={RESERVED_HEIGHT} style={{ overflow: 'hidden' }}>
                <ins
                    ref={ins}
                    className="adsbygoogle"
                    style={{ display: 'block', minHeight: RESERVED_HEIGHT }}
                    data-ad-client={ADSENSE_CLIENT}
                    data-ad-slot={slot}
                    data-ad-format="horizontal"
                    /* `false` a propósito: en true el anuncio se va a ancho
                       completo en móvil y su alto deja de ser predecible, que
                       es justo lo que el hueco reservado intenta evitar. */
                    data-full-width-responsive="false"
                />
            </Box>
            {near && (
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
