'use client';

import { useEffect, useState } from 'react';
import { isInterruptedLoad, reloadOnceAfterInterruption } from '@/lib/interruptedStream';

/**
 * El último límite de errores: lo que revienta por encima de `app/error.tsx`
 * (el layout raíz, el router). Sin él, Next mostraba su pantalla en blanco de
 * "Application error: a client-side exception has occurred".
 *
 * El caso conocido es una respuesta cortada a mitad de camino —p. ej. con el
 * servidor saturado durante un deploy, Firefox lanza `Error in input stream`
 * al leer la navegación—: la página no se puede reconstruir desde lo que
 * llegó, así que se recarga una vez (ver `reloadOnceAfterInterruption`). Si ya
 * se recargó hace menos de un minuto, o el error es otro, se ofrece hacerlo a
 * mano.
 *
 * Reemplaza al layout raíz, así que trae su propio <html> y <body>, sin
 * Mantine ni los estilos del sitio: solo estilos en línea.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    const [reloading, setReloading] = useState(false);

    useEffect(() => {
        if (isInterruptedLoad(error) && reloadOnceAfterInterruption()) setReloading(true);
    }, [error]);

    return (
        <html lang="es">
            <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
                <main style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
                    {reloading ? (
                        <p role="status">Cargando la página…</p>
                    ) : (
                        <>
                            <h1 style={{ fontSize: 20 }}>No pudimos cargar esta página</h1>
                            <p>La conexión se interrumpió o algo falló al mostrarla.</p>
                            <button type="button" onClick={() => window.location.reload()}
                                style={{ font: 'inherit', padding: '10px 18px', borderRadius: 8, border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}>
                                Volver a cargar
                            </button>
                        </>
                    )}
                </main>
            </body>
        </html>
    );
}
