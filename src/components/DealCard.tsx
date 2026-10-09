import { Badge, Box, Group, Text } from '@mantine/core';
import GameCard from './GameCard';
import { dealAgeLabel, dealBadgeLine, dealCardGame } from '@/lib/deals';
import type { Deal } from '@/lib/types';

/**
 * La tarjeta de un juego en oferta: `GameCard` con el precio de la OFERTA
 * (ver `dealCardGame`) y debajo la rebaja, el precio típico y cuánto lleva así.
 *
 * Sin `'use client'` y solo con primitivas de Mantine, a propósito: la monta
 * `DealsLanding`, que es un Server Component (los compuestos como
 * `Card.Section` llegan `undefined` ahí), y también `HomeClient`. La línea de
 * la rebaja sale en el HTML del servidor, que es lo único que leen los
 * crawlers de IA.
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
    const age = dealAgeLabel(deal, isToday);
    return (
        <Box data-deal-card style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
            <Box style={{ flex: 1 }}>
                {/* Precio, consola y condición de la OFERTA (`dealCardGame`) y su
                    tienda en «Vendido por»: el mínimo del juego puede ser de
                    otra consola o condición y contradiría la línea de abajo. */}
                <GameCard
                    game={dealCardGame(deal)}
                    platformSlug={deal.platform}
                    seller={deal.seller}
                    priority={priority}
                />
            </Box>
            <Text fz="sm" fw={700} c="var(--mantine-color-green-text)" data-deal-line>
                {dealBadgeLine(deal)}
            </Text>
            <Group gap={4} wrap="wrap">
                {/* «Registrado» y no «histórico»: la serie empieza cuando PIO
                    empezó a seguir el juego, no en su lanzamiento. */}
                {deal.is_all_time_low && (
                    <Badge size="sm" color="green" variant="light">
                        Mínimo registrado
                    </Badge>
                )}
                {age && (
                    <Badge size="sm" color={deal.is_new ? 'primaryRed' : 'gray'} variant="light">
                        {age}
                    </Badge>
                )}
            </Group>
        </Box>
    );
}
