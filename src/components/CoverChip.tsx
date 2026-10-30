'use client';

import { forwardRef, type ReactNode } from 'react';
import { Box, type BoxProps, type ElementProps, type MantineStyleProp } from '@mantine/core';
import { onDark, scrim } from '@/lib/colors';

export interface CoverChipProps extends BoxProps, ElementProps<'div'> {
    /** Opacidad del velo: `strong` para cifras (la nota), `base` para iconos. */
    strength?: 'base' | 'strong';
    style?: MantineStyleProp;
    children: ReactNode;
}

/** Recuadro sobre una portada: velo oscuro, radio `sm` y contenido blanco y
 *  centrado. Es lo que deja leer un icono o una cifra encima de una foto cuyo
 *  color no se conoce. Lo usan la condición de la oferta y el 💸 de afiliado
 *  de `GameCard`, y `RatingPill`; antes cada uno repetía el mismo estilo a
 *  mano. El tamaño y el relleno los pone quien lo usa. Reenvía la ref para
 *  poder ser el objetivo de un `Tooltip`. */
const CoverChip = forwardRef<HTMLDivElement, CoverChipProps>(function CoverChip(
    { strength = 'base', style, children, ...others },
    ref,
) {
    return (
        <Box
            ref={ref}
            {...others}
            style={[{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--mantine-radius-sm)',
                background: scrim[strength],
                color: onDark.text,
            }, style]}
        >
            {children}
        </Box>
    );
});

export default CoverChip;
