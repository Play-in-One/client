import { Skeleton } from '@mantine/core';
import type { CSSProperties } from 'react';

/**
 * Una línea de texto en esqueleto, para poner DENTRO del mismo `Text` (o
 * `Title`) que usa el componente real, con `component="div"`.
 *
 * El bloque mide `0.8em` y va en línea: el alto de la línea lo pone el
 * `line-height` del contenedor, igual que con texto de verdad. Así el esqueleto
 * hereda tamaño de letra, interlineado y márgenes del componente, y no hay que
 * copiar alturas en píxeles que se desfasan al primer cambio de tipografía.
 * Varias líneas: varios `SkeletonLine` separados por `<br />`.
 */
export default function SkeletonLine({ width = '100%', style }: { width?: CSSProperties['width']; style?: CSSProperties }) {
    return (
        <Skeleton
            display="inline-block"
            height="0.8em"
            width={width}
            radius="sm"
            style={{ verticalAlign: 'middle', maxWidth: '100%', ...style }}
        />
    );
}
