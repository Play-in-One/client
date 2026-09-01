'use client';

import { Tooltip } from '@mantine/core';
import type { Seller } from '@/lib/types';

interface Props {
    seller: Pick<Seller, 'is_international'>;
    size?: number;
}

/**
 * Marca las tiendas que importan.
 *
 * Solo se muestra en las internacionales: lo nacional es el caso por defecto y
 * rotularlo convertiría en ruido la marca que sí importa. El globo no dice nada
 * del envío —eso lo declara el desglose del precio—, sino de dónde sale el
 * producto, que es lo que cambia los plazos de entrega y la garantía.
 */
export default function SellerScopeBadge({ seller, size = 13 }: Props) {
    if (!seller.is_international) return null;

    return (
        <Tooltip label="Tienda internacional" withArrow events={{ hover: true, focus: true, touch: true }}>
            <span role="img" aria-label="Tienda internacional" style={{ fontSize: size, lineHeight: 1 }}>
                🌐
            </span>
        </Tooltip>
    );
}
