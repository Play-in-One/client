"use client";

import { useEffect, useState } from 'react';
import { Alert, Button, Center, Container, Loader, Stack } from '@mantine/core';
import { isInterruptedLoad } from '@/lib/interruptedStream';

/** Cuánto se espera antes de dar por perdida una página cuya carga se cortó. */
const INTERRUPTED_GRACE_MS = 8000;

/**
 * La página llega en streaming: el HTML, los datos de React y los chunks de
 * cada ruta vienen por partes. Si la carga se corta antes de terminar —lo
 * normal es que la persona RECARGUE, pulse Escape o la X que ocupa el botón de
 * recargar mientras la página carga—, lo pendiente falla y el error cae aquí:
 * `Connection closed.`, `network error`, un chunk que no cargó o, con el
 * módulo de un componente sin definir, el #130 de React. Antes eso pintaba
 * "No pudimos cargar esta página" encima de la página que se estaba yendo, y
 * en Firefox quedaba a la vista hasta que la nueva pintaba (segundos en una
 * ficha lenta).
 *
 * No es un fallo del sitio sino una carga interrumpida, así que primero se
 * muestra el mismo estado de carga y solo si la página sigue aquí pasado un
 * rato se ofrece recargarla.
 *
 * "Reintentar" pide SIEMPRE un documento nuevo. `reset()` solo vuelve a
 * renderizar con lo que ya está en la página —el mismo stream cortado, el
 * mismo módulo que falta—, así que el error se repetía y el botón parecía no
 * hacer nada. Una recarga de la URL actual sirve igual tras una navegación del
 * cliente.
 */
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
    const interrupted = isInterruptedLoad(error);
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
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
    </Stack></Container>;
}
