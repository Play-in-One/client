'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Anchor, Box, Button, Group, Paper, Stack, Text } from '@mantine/core';

import { useConsent } from '@/context/ConsentContext';
import { darkScale, decorative, onDark } from '@/lib/colors';

/* «Solo esenciales» en contorno sobre la tarjeta oscura. Van como variables del
   botón y no como clase: Mantine las fija inline según la variante, y una clase
   no las puede pisar. */
const GHOST_BUTTON_VARS = {
    '--button-bg': 'transparent',
    '--button-hover': onDark.hover,
    '--button-color': onDark.text,
    '--button-bd': `1px solid ${onDark.borderStrong}`,
};

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

    /* El aviso viene en el HTML del servidor (`pending`) y `ConsentScript`
       decide antes de la primera pintura si se ve: así un visitante nuevo lo
       tiene desde el principio y no a los ~9 s, al hidratar en un móvil lento.
       Tras montar, `ready` y `parseConsent` deciden como siempre. */
    const hidden = HIDDEN_ON.some((prefix) => pathname?.startsWith(prefix));
    const [queued, setQueued] = useState(false);
    const visible = ready && consent === null && !hidden && !queued;
    const state = !ready ? 'pending' : visible ? 'open' : 'closed';

    // Un clic antes de hidratar quedó guardado por `ConsentScript`.
    useEffect(() => {
        if (!ready) return;
        const w = window as typeof window & { __pioConsentReady?: boolean; __pioConsentChoice?: string };
        w.__pioConsentReady = true;
        const choice = w.__pioConsentChoice;
        if (choice !== 'accept' && choice !== 'essential') return;
        delete w.__pioConsentChoice;
        if (consent !== null) return;
        setQueued(true);
        void decide(choice, choice === 'accept').finally(() => setQueued(false));
    }, [ready, consent, decide]);

    /* El banner es `position: fixed` a z-index 300, o sea que está FUERA del
       flujo y por encima de todo: mientras se muestra, sus ~250-310px de alto
       (más el margen) dejan muerta la franja inferior de cualquier página,
       incluida la última fila de tarjetas de la galería. Se compensa reservando
       ese alto al final del documento mientras dura. Se mide en vez de fijarlo:
       el alto depende de cuántas líneas ocupe el texto en cada ancho.

       El nodo va en estado y no en un `useRef`, para que el efecto corra
       cuando el nodo exista aunque cambie de montaje. */
    const [affix, setAffix] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!affix) return;
        /* Se observa el contenedor y no el Paper: está montado siempre (mide
           0 cuando no hay aviso). Así el mismo observer cubre la aparición, el
           cierre y los saltos de alto cuando el texto cambia de líneas.
           Se reserva desde el borde superior de la tarjeta hasta el final del
           viewport, no solo su alto: flota separada del borde y ese margen
           también tapa contenido. */
        const apply = () => {
            const { height, top } = affix.getBoundingClientRect();
            document.body.style.paddingBottom = height > 0 ? `${window.innerHeight - top}px` : '';
        };
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(affix);
        return () => {
            observer.disconnect();
            document.body.style.paddingBottom = '';
        };
    }, [affix]);

    /* Posición y visibilidad las resuelve `.cookie-banner` en globals.css,
       según `data-state` y el `data-consent` que pone `ConsentScript`. No usa
       `Affix`: su Portal no se renderiza en el servidor. */
    return (
        <Box ref={setAffix} className="cookie-banner" data-state={state}>
                {state !== 'closed' && (
                    <Paper
                        /* Siempre oscura, en los dos temas. El borde es lo que la
                           separa del fondo en modo oscuro (#121212). */
                        style={{
                            backgroundColor: darkScale[8],
                            border: `1px solid ${onDark.border}`,
                        }}
                        p="lg"
                        radius="xl"
                        shadow="xl"
                        role="dialog"
                        aria-live="polite"
                        aria-label="Preferencias de cookies"
                    >
                        <Stack gap="md">
                            <Group gap="xs" wrap="nowrap">
                                <Text component="span" fz="lg" lh={1} aria-hidden>
                                    🍪
                                </Text>
                                <Text fw={700} c="white">
                                    Tu privacidad importa
                                </Text>
                            </Group>
                            <Text fz="sm" lh={1.6} c={darkScale[1]}>
                                Si aceptas, usamos una cookie propia y Google Analytics para
                                entender cómo se usa Play in One y mejorar el sitio. También
                                mostramos anuncios de Google para sostenerlo: aceptando se ajustan a
                                tu navegación; si no, los verás igual, sin personalizar.{' '}
                                <Anchor
                                    component={Link}
                                    href="/cookies"
                                    fz="sm"
                                    c="primaryRed.4"
                                    underline="always"
                                >
                                    Política de cookies
                                </Anchor>
                                .
                            </Text>
                            <Group className="cookie-banner__actions" justify="flex-end" gap="md">
                                <Anchor
                                    className="cookie-banner__customize"
                                    component={Link}
                                    href="/cookies"
                                    fz="sm"
                                    fw={600}
                                    c={darkScale[1]}
                                    underline="always"
                                >
                                    Personalizar
                                </Anchor>
                                <Group className="cookie-banner__buttons" gap="sm" wrap="nowrap">
                                    <Button
                                        size="md"
                                        fz="sm"
                                        radius="xl"
                                        variant="default"
                                        vars={() => ({ root: GHOST_BUTTON_VARS })}
                                        data-consent-choice="essential"
                                        onClick={() => decide('essential', false)}
                                    >
                                        Solo esenciales
                                    </Button>
                                    <Button
                                        size="md"
                                        fz="sm"
                                        radius="xl"
                                        style={{ boxShadow: decorative.primaryButtonShadow }}
                                        data-consent-choice="accept"
                                        onClick={() => decide('accept', true)}
                                    >
                                        Aceptar todo
                                    </Button>
                                </Group>
                            </Group>
                        </Stack>
                    </Paper>
                )}
        </Box>
    );
}
