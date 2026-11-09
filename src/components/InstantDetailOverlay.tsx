'use client';

import { useEffect } from 'react';
import { Box } from '@mantine/core';
import { GameHeroFrame } from '@/app/juego/[slug]/hero/GameHero';
import { ConsoleDetailSkeleton } from '@/components/consoles/ConsoleDetail';
import PostHeaderSkeleton from '@/components/PostHeaderSkeleton';
import { cancelSeededNavigation, type PendingNavigation } from '@/lib/navigationSeed';

/**
 * La ficha pintada en el MISMO clic, con lo que la tarjeta ya sabía (ver
 * `lib/navigationSeed.ts`), mientras el servidor todavía no responde.
 *
 * Tapa la página anterior en vez de reemplazarla: queda montada debajo, en su
 * posición de scroll, así que si la navegación se cancela no hay nada que
 * restaurar, y el historial guarda bien dónde estaba la galería para el botón
 * Atrás (Next registra la entrada antes de subir el scroll).
 *
 * Fijo bajo el navbar y sin scroll propio: cuando la ruta se confirma, Next
 * sube el documento al inicio y el `loading.tsx` de la ficha pinta lo mismo,
 * en el mismo sitio. Los componentes son los de las fases siguientes
 * (`GameHeroFrame`, `ConsoleDetailSkeleton`): por eso el relevo no salta.
 */
export default function InstantDetailOverlay({ pending }: { pending: PendingNavigation }) {
    const { seed, token } = pending;

    useEffect(() => {
        // Escape devuelve a la página anterior sin esperar la respuesta.
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') cancelSeededNavigation(token);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [token]);

    return (
        <Box
            data-instant-detail={seed.kind}
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="view-fade"
            style={{
                position: 'fixed',
                top: 'var(--pio-navbar-h)',
                left: 0,
                right: 0,
                bottom: 0,
                // Bajo el navbar (100), sobre todo lo demás de la página.
                zIndex: 99,
                /* `clip` y no `hidden`: `hidden` vuelve al overlay un
                   contenedor de scroll, y el título fijo de la ficha
                   (`position: sticky; top: 73`) se pegaba al borde del overlay,
                   8 px más abajo que en la ficha. */
                overflow: 'clip',
                overscrollBehavior: 'contain',
                background: 'var(--mantine-color-body)',
            }}
        >
            {seed.kind === 'game' ? (
                <GameHeroFrame data={{
                    id: seed.id,
                    name: seed.name,
                    slug: seed.slug,
                    image: seed.image,
                    placeholderSrc: seed.placeholderSrc,
                    platforms: seed.platforms,
                    selectedPlatform: seed.selectedPlatform,
                    price: seed.price?.amount ?? null,
                    shipping: seed.price?.shipping ?? null,
                    condition: seed.price?.condition ?? null,
                    seller: seed.price?.seller?.name ?? null,
                }} />
            ) : seed.kind === 'console' ? (
                <ConsoleDetailSkeleton seed={seed} />
            ) : (
                <PostHeaderSkeleton seed={seed} />
            )}
        </Box>
    );
}
