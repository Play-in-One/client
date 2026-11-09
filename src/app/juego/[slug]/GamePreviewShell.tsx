import { Anchor, Box, Text, VisuallyHidden } from '@mantine/core';
import type { GamePreview } from '@/lib/api';
import { gamePath } from '@/lib/seo';
import { GameHeroFrame, GameOffersSkeleton } from './hero/GameHero';

/**
 * El primer bloque que transmite la ficha: datos reales del preview (portada,
 * nombre, consolas, precio con las preferencias) en el MISMO marco que la
 * ficha completa (`hero/GameHero.tsx`). Lo que todavía no llegó —las ofertas,
 * el historial— es esqueleto con su alto real.
 *
 * Con `failed` (el detalle no se pudo leer) el esqueleto de ofertas se cambia
 * por el aviso y un "Reintentar".
 */
export default function GamePreviewShell({ game, failed = false }: { game: GamePreview; failed?: boolean }) {
    return <GameHeroFrame
        data={{
            id: game.id,
            name: game.name,
            image: game.image ?? null,
            platforms: game.platforms,
            selectedPlatform: game.selected_platform,
            price: game.min_price,
            shipping: game.min_price_shipping,
            condition: game.min_price_condition,
            seller: game.min_price_seller?.name ?? null,
        }}
        status={failed ? (
            <Box role="alert">
                <Text mb="md">No pudimos cargar el resto de la ficha.</Text>
                <Anchor href={gamePath(game, game.selected_platform ?? undefined)}>Reintentar</Anchor>
            </Box>
        ) : <>
            {/* Solo para lectores de pantalla: como texto visible ocupaba una
                fila que la ficha completa no tiene. Va en posición absoluta,
                así que tampoco abre un hueco en el Stack. */}
            <VisuallyHidden role="status">Cargando ofertas y detalles…</VisuallyHidden>
            <GameOffersSkeleton />
        </>}
    />;
}
