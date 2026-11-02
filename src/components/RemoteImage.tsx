'use client';

import { useState, type CSSProperties, type MouseEventHandler } from 'react';
import Image from 'next/image';

const PLACEHOLDER = '/placeholder-game.png';

/* Imagen externa (portada, noticia) redimensionada por el optimizador de Next.
 *
 * Las portadas vienen de CDNs de tiendas y suelen pesar entre 200 KB y 1,5 MB
 * para mostrarse a 150-300 px; un visitante nuevo en móvil las bajaba enteras.
 * El optimizador las sirve al ancho de `sizes`, en AVIF o WebP, desde la caché
 * del frontend (`/app/.next/cache/images`, volumen persistente en producción).
 *
 * Unos pocos hosts (lukiegames, weplay, falabella, howlongtobeat…) rechazan la
 * descarga desde el servidor con 403: entonces se pide la URL original desde
 * el navegador, como se hacía antes para todas, y si también falla se muestra
 * el marcador. Medido el 2026-11-02: el optimizador funciona para 37 de 43
 * hosts, el 98 % de las tarjetas.
 */
export default function RemoteImage({ src, alt, sizes, priority, style, onMouseEnter, onMouseLeave }: {
    src: string | null;
    alt: string;
    sizes: string;
    priority?: boolean;
    style?: CSSProperties;
    onMouseEnter?: MouseEventHandler<HTMLImageElement>;
    onMouseLeave?: MouseEventHandler<HTMLImageElement>;
}) {
    // Qué URL falló y en qué etapa: si cambia `src`, el intento vuelve a empezar.
    const [failure, setFailure] = useState<{ src: string | null; stage: 'optimized' | 'original' } | null>(null);
    const stage = failure?.src === src ? failure.stage : null;
    const usePlaceholder = !src || stage === 'original';
    return <Image src={usePlaceholder ? PLACEHOLDER : src} alt={alt} fill sizes={sizes} priority={priority}
        unoptimized={usePlaceholder || stage === 'optimized'} style={style}
        onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
        onError={() => {
            if (usePlaceholder) return;
            setFailure({ src, stage: stage === 'optimized' ? 'original' : 'optimized' });
        }} />;
}
