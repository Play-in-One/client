'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Affix, Anchor, Button, Group, Paper, Stack, Text, Transition } from '@mantine/core';

import { useConsent } from '@/context/ConsentContext';

// Rutas de administración: son tráfico propio y no se miden (ver
// PageViewTracker), así que preguntar por el consentimiento ahí no tiene
// sentido y además el banner tapa el dashboard.
const HIDDEN_ON = ['/staff'];

/* Aviso de cookies.
 *
 * Aceptar y rechazar cuestan exactamente un clic y se ven igual de destacados.
 * No es un detalle de estilo: un banner donde rechazar es más difícil que
 * aceptar no obtiene un consentimiento libre, y por tanto no obtiene ninguno.
 *
 * No bloquea la página. Sin decisión, PIO ya funciona en su nivel de medición
 * anónima, así que no hay nada que retener detrás de un modal.
 */
export function CookieBanner() {
    const { consent, ready, decide } = useConsent();
    const pathname = usePathname();

    // `ready` evita que el banner asome durante la hidratación a quien ya
    // había decidido: la cookie solo se puede leer una vez montado.
    const hidden = HIDDEN_ON.some((prefix) => pathname?.startsWith(prefix));
    const visible = ready && consent === null && !hidden;

    /* El banner es `position: fixed` a z-index 300, o sea que está FUERA del
       flujo y por encima de todo: mientras se muestra, sus ~200-260px de alto en
       móvil dejan muerta la franja inferior de cualquier página, incluida la
       última fila de tarjetas de la galería. Se compensa reservando ese alto al
       final del documento mientras dura. Se mide en vez de fijarlo: el alto
       depende de cuántas líneas ocupe el texto legal en cada ancho. */
    const affixRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const affix = affixRef.current;
        if (!affix) return;
        /* Se observa el Affix y no el Paper: el Affix está montado siempre (mide
           0 cuando no hay banner) y el Paper aparece un render más tarde, dentro
           del Transition. Así el mismo observer cubre montaje, desmontaje y los
           saltos de alto cuando el texto legal cambia de número de líneas. */
        const apply = () => {
            const { height } = affix.getBoundingClientRect();
            document.body.style.paddingBottom = height > 0 ? `${height}px` : '';
        };
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(affix);
        return () => {
            observer.disconnect();
            document.body.style.paddingBottom = '';
        };
    }, []);

    return (
        <Affix ref={affixRef} position={{ bottom: 0, left: 0, right: 0 }} zIndex={300}>
            <Transition mounted={visible} transition="slide-up" duration={200}>
                {(styles) => (
                    <Paper
                        style={styles}
                        p="md"
                        radius={0}
                        withBorder
                        role="dialog"
                        aria-live="polite"
                        aria-label="Preferencias de cookies"
                    >
                        <Stack gap="sm" maw={1100} mx="auto">
                            <Text fz="sm">
                                Cumpliendo con la Ley N° 19.628 sobre Protección de la Vida Privada, te
                                contamos que usamos una
                                cookie propia para entender cómo se usa Play in One y así mejorar nuestras
                                recomendaciones y ofrecerte un mejor servicio. Si prefieres que no, seguimos
                                contando visitas de forma anónima y agregada, sin guardar nada en tu
                                dispositivo.{' '}
                                <Anchor component={Link} href="/cookies" fz="sm">
                                    Más detalle y opciones
                                </Anchor>
                                .
                            </Text>
                            <Group gap="sm">
                                <Button size="sm" onClick={() => decide('accept')}>
                                    Aceptar
                                </Button>
                                <Button size="sm" variant="default" onClick={() => decide('essential')}>
                                    Solo lo esencial
                                </Button>
                                <Anchor component={Link} href="/cookies" fz="sm" c="dimmed">
                                    Personalizar
                                </Anchor>
                            </Group>
                        </Stack>
                    </Paper>
                )}
            </Transition>
        </Affix>
    );
}
