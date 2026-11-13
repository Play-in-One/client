'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { shouldUpgradeCover, type HiResConnection } from '@/lib/hiRes';

/** Cuando la página ya terminó de cargar y el navegador está ocioso. */
function whenSettled(run: () => void): () => void {
    let cancelled = false;
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
        if (cancelled) return;
        if ('requestIdleCallback' in window) idle = window.requestIdleCallback(run, { timeout: 2000 });
        else timer = setTimeout(run, 200);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
        cancelled = true;
        window.removeEventListener('load', start);
        if (idle !== undefined) window.cancelIdleCallback(idle);
        if (timer !== undefined) clearTimeout(timer);
    };
}

/**
 * Portada de alta calidad que reemplaza a la liviana una vez que todo cargó.
 *
 * La portada base se pide al ancho justo del hueco (ver `RemoteImage`) para no
 * frenar la primera visita; en escritorio es incluso la misma URL que la de la
 * tarjeta. Esta capa va encima, con más ancho y calidad, y solo se pide cuando
 * la página ya cargó (`load`) y el navegador está ocioso. Aparece con un
 * fundido cuando está decodificada, en la misma caja, sin mover nada. Si falla
 * (hosts que rechazan al optimizador) o la conexión no lo amerita, no hace
 * nada: queda la imagen anterior.
 */
export default function HiResCover({ src, sizes, fit = 'cover', padding, background }: {
    src: string | null;
    /** Más ancho que el de la portada base. */
    sizes: string;
    fit?: CSSProperties['objectFit'];
    padding?: CSSProperties['padding'];
    /** Fondo opaco para `contain`: tapa la portada liviana de abajo. */
    background?: string;
}) {
    const [armed, setArmed] = useState(false);
    const [visible, setVisible] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setArmed(false); setVisible(false); setFailed(false);
        const connection = (navigator as Navigator & { connection?: HiResConnection }).connection;
        if (!shouldUpgradeCover(src, connection)) return;
        return whenSettled(() => setArmed(true));
    }, [src]);

    if (!armed || failed || !src) return null;
    return (
        <Image src={src} alt="" aria-hidden fill sizes={sizes} quality={90} loading="eager" data-hires-cover
            style={{ objectFit: fit, padding, background, opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease-out' }}
            onLoad={(event) => {
                const img = event.currentTarget;
                (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined).then(() => setVisible(true));
            }}
            onError={() => setFailed(true)} />
    );
}
