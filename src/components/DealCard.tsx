import { Box } from '@mantine/core';
import GameCard from './GameCard';
import DealPriceLabel from './DealPriceLabel';
import { dealCardGame } from '@/lib/deals';
import type { Deal } from '@/lib/types';

/**
 * La tarjeta de un juego en oferta: `GameCard` con el precio de la OFERTA
 * (ver `dealCardGame`) y, junto al precio, la rebaja «↓N% (i)» cuya (i) abre
 * el detalle (condición, precio típico, ahorro, días en oferta, mínimo
 * registrado). Ver `DealPriceLabel`.
 *
 * Sin `'use client'` y solo con primitivas de Mantine, a propósito: la monta
 * `DealsLanding`, que es un Server Component (los compuestos como
 * `Card.Section` llegan `undefined` ahí), y también `HomeClient`. El detalle
 * de la rebaja sale igualmente en el HTML del servidor (texto accesible dentro
 * de la etiqueta), que es lo único que leen los crawlers de IA.
 */
export default function DealCard({
    deal,
    priority,
    isToday = true,
}: {
    deal: Deal;
    priority?: boolean;
    /** Si la tanda es la de hoy (`isTodayDeals`). Lo calcula el SERVIDOR y
     *  llega como prop: esta tarjeta también se pinta en `HomeClient`, y leer
     *  el reloj en el render del cliente podría no coincidir con el servidor. */
    isToday?: boolean;
}) {
    return (
        <Box data-deal-card style={{ height: '100%' }}>
            {/* Precio, consola y condición de la OFERTA (`dealCardGame`) y su
                tienda en «Vendido por»: el mínimo del juego puede ser de otra
                consola o condición y contradiría la rebaja de al lado. */}
            <GameCard
                game={dealCardGame(deal)}
                platformSlug={deal.platform}
                seller={deal.seller}
                priority={priority}
                priceAddon={<DealPriceLabel deal={deal} isToday={isToday} />}
                priceConsole={deal.platform}
            />
        </Box>
    );
}
