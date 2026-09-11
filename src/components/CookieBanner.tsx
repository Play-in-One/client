'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Affix, Anchor, Button, Group, Paper, Stack, Text, Transition } from '@mantine/core';

import { useConsent } from '@/context/ConsentContext';
import { darkScale, decorative } from '@/lib/colors';

/* «Solo esenciales» en contorno sobre la tarjeta oscura. Van como variables del
   botón y no como clase: Mantine las fija inline según la variante, y una clase
   no las puede pisar. */
const GHOST_BUTTON_VARS = {
    '--button-bg': 'transparent',
    '--button-hover': 'rgba(255, 255, 255, 0.06)',
    '--button-color': '#fff',
    '--button-bd': '1px solid rgba(255, 255, 255, 0.18)',
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

    // `ready` evita que el banner asome durante la hidratación a quien ya
    // había decidido: la cookie solo se puede leer una vez montado.
    const hidden = HIDDEN_ON.some((prefix) => pathname?.startsWith(prefix));
    const visible = ready && consent === null && !hidden;

    /* El banner es `position: fixed` a z-index 300, o sea que está FUERA del
       flujo y por encima de todo: mientras se muestra, sus ~250-310px de alto
       (más el margen) dejan muerta la franja inferior de cualquier página,
       incluida la última fila de tarjetas de la galería. Se compensa reservando
       ese alto al final del documento mientras dura. Se mide en vez de fijarlo:
       el alto depende de cuántas líneas ocupe el texto en cada ancho.

       El nodo va en estado y no en un `useRef`: `Affix` pinta dentro de un
       `Portal` que no monta a sus hijos hasta su propio efecto, así que en el
       primer efecto de aquí un ref todavía vale `null`. Con `[]` de
       dependencias el efecto no volvía a correr y la reserva nunca se aplicó. */
    const [affix, setAffix] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!affix) return;
        /* Se observa el Affix y no el Paper: el Affix está montado siempre (mide
           0 cuando no hay banner) y el Paper aparece un render más tarde, dentro
           del Transition. Así el mismo observer cubre montaje, desmontaje y los
           saltos de alto cuando el texto legal cambia de número de líneas.
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

    /* La posición (esquina inferior derecha en escritorio, ancho completo con
       margen en móvil) la resuelve `.cookie-banner` en globals.css: `Affix` solo
       admite una posición fija y aquí depende del ancho. */
    return (
        <Affix ref={setAffix} className="cookie-banner" zIndex={300}>
            <Transition mounted={visible} transition="slide-up" duration={200}>
                {(styles) => (
                    <Paper
                        /* Siempre oscura, en los dos temas. El borde es lo que la
                           separa del fondo en modo oscuro (#121212). */
                        style={{
                            ...styles,
                            backgroundColor: darkScale[8],
                            border: '1px solid rgba(255, 255, 255, 0.08)',
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
                                Usamos una cookie propia para entender cómo se usa Play in One y
                                mejorar el sitio, y mostramos anuncios de Google para sostenerlo. Si
                                aceptas, esos anuncios se ajustan a tu navegación; si no, los verás
                                igual, sin personalizar.{' '}
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
                                        onClick={() => decide('essential', false)}
                                    >
                                        Solo esenciales
                                    </Button>
                                    <Button
                                        size="md"
                                        fz="sm"
                                        radius="xl"
                                        style={{ boxShadow: decorative.primaryButtonShadow }}
                                        onClick={() => decide('accept', true)}
                                    >
                                        Aceptar todo
                                    </Button>
                                </Group>
                            </Group>
                        </Stack>
                    </Paper>
                )}
            </Transition>
        </Affix>
    );
}
