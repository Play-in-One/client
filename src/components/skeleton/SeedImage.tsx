/* eslint-disable @next/next/no-img-element -- a plain <img> on purpose: see below. */
import type { CSSProperties } from 'react';

/**
 * La imagen que la tarjeta ya tenía decodificada (`currentSrc`), debajo de la
 * portada definitiva mientras esta carga.
 *
 * La tarjeta y la ficha piden anchos distintos al optimizador (`sizes`), así
 * que la portada de la ficha es otra URL que no está en caché: sin esto el
 * hueco quedaba vacío hasta que bajaba. Va con `<img>` simple y no con
 * `next/image` porque la URL ya es la final, la del optimizador incluida, y
 * así la pinta en el primer frame (`decoding="sync"`).
 */
export default function SeedImage({ src, fit = 'cover', padding }: {
    src: string | undefined;
    fit?: CSSProperties['objectFit'];
    padding?: CSSProperties['padding'];
}) {
    if (!src) return null;
    return (
        <img src={src} alt="" aria-hidden decoding="sync" data-seed-image
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, padding }} />
    );
}
