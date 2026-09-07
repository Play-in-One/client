'use client';

import { Tooltip } from '@mantine/core';
import { DIGITAL_VARIANT_LABEL, isDigital } from '@/lib/conditions';

interface Props {
    /** La condición ALMACENADA, cruda: puede ser 'store' o 'key', no solo
     *  'digital'. Se pasa entera y no un booleano para que el `return null`
     *  viva en un sitio y los tres call sites sean una línea sin ternario. */
    condition?: string | null;
    size?: number;
}

/**
 * Marca los juegos que son una descarga.
 *
 * Mismo criterio que `SellerScopeBadge`: solo se muestra en el caso que se
 * desvía de lo habitual —lo físico es el default del catálogo— porque rotular
 * también lo normal convierte en ruido la marca que sí importa.
 *
 * El tooltip es el único sitio donde sobrevive el matiz de la familia (tienda
 * oficial vs código de canje): cambia la garantía y el proceso de canje, así
 * que borrarlo pierde información real, pero meterlo en el badge de la tabla
 * gastaría una columna en algo que casi nadie necesita.
 */
export default function DigitalBadge({ condition, size = 13 }: Props) {
    if (!isDigital(condition)) return null;

    const label = DIGITAL_VARIANT_LABEL[condition as string] ?? 'Juego digital (descarga)';

    return (
        <Tooltip label={label} withArrow events={{ hover: true, focus: true, touch: true }}>
            <span role="img" aria-label={label} style={{ fontSize: size, lineHeight: 1 }}>
                💾
            </span>
        </Tooltip>
    );
}
