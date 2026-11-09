"use client";

import { useEffect, useState } from 'react';
import { Alert, Button, Center, Container, Loader, Stack } from '@mantine/core';
import { isInterruptedStream } from '@/lib/interruptedStream';

/** Cuánto se espera antes de dar por perdida una página cuyo stream se cortó. */
const INTERRUPTED_GRACE_MS = 8000;

/**
 * La página llega en streaming: el HTML y los datos de React vienen por partes.
 * Si la carga se corta antes de terminar —lo normal es que la persona RECARGUE
 * o pulse Escape mientras espera—, React rechaza lo pendiente con
 * `Connection closed.` y el error cae aquí. Antes eso pintaba "No pudimos
 * cargar esta página" encima de la página que se estaba yendo, y en Firefox
 * quedaba a la vista hasta que la nueva pintaba (segundos en una ficha lenta).
 *
 * No es un fallo del sitio sino una carga interrumpida, así que primero se
 * muestra el mismo estado de carga y solo si la página sigue aquí pasado un
 * rato se ofrece recargarla. `reset()` no sirve en ese caso: vuelve a leer el
 * mismo stream ya cerrado; hace falta un documento nuevo.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const interrupted = isInterruptedStream(error);
    const [waiting, setWaiting] = useState(interrupted);

    useEffect(() => {
        if (!interrupted) return;
        const timer = window.setTimeout(() => setWaiting(false), INTERRUPTED_GRACE_MS);
        return () => window.clearTimeout(timer);
    }, [interrupted]);

    if (waiting) {
        return <Container py="xl"><Center mih={240} role="status">
            <Loader color="primaryRed" aria-label="Cargando la página" />
        </Center></Container>;
    }
    return <Container py="xl"><Stack>
        <Alert color="danger" title="No pudimos cargar esta página">
            {interrupted ? 'La carga se interrumpió antes de terminar.' : 'Inténtalo nuevamente en unos momentos.'}
        </Alert>
        <Button onClick={interrupted ? () => window.location.reload() : reset}>Reintentar</Button>
    </Stack></Container>;
}
