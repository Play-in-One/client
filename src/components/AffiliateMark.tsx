'use client';

import { Box, Tooltip, type BoxProps } from '@mantine/core';
import { useAdmin } from '@/context/AdminContext';
import CoverChip from './CoverChip';

interface Props extends BoxProps {
    /** Qué marca el 💸; va al tooltip y al aria-label. */
    label: string;
    /** Alto del recuadro, en px. */
    size?: number;
}

/**
 * Solo admin: 💸 de "tienda afiliada a PIO" (link de afiliado o cupón de
 * convenio activo). Para un visitante no pinta nada, ni el contenedor.
 *
 * El chequeo de admin vive aquí y no en quien la usa, para que ningún sitio
 * nuevo la muestre al público por olvidarlo. `isAdmin` arranca en `false` en
 * el servidor y en la hidratación (AdminContext lee el token tras montar), así
 * que no hay desajuste SSR/cliente en páginas ISR como la home.
 *
 * El click se corta: la tarjeta entera es un <Link> y tocar el 💸 para leer
 * el tooltip navegaría a la ficha.
 */
export default function AffiliateMark({ label, size = 22, ...boxProps }: Props) {
    const { isAdmin } = useAdmin();
    if (!isAdmin) return null;

    return (
        <Box
            {...boxProps}
            style={{ display: 'flex', zIndex: 2 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <Tooltip label={label} events={{ hover: true, focus: true, touch: true }}>
                <CoverChip
                    role="img"
                    aria-label={label}
                    data-testid="affiliate-mark"
                    tabIndex={0}
                    w={size}
                    h={size}
                    style={{ fontSize: Math.round(size * 0.7), lineHeight: 1, cursor: 'default' }}
                >
                    💸
                </CoverChip>
            </Tooltip>
        </Box>
    );
}
