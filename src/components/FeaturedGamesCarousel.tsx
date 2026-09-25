'use client';

import { useEffect, useRef, useState } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';
import { Box, Group, Skeleton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Carousel } from '@mantine/carousel';
import type { Game } from '@/lib/types';
import FeaturedGameCard, { CARD_HEIGHT, CARD_HEIGHT_COMPACT } from '@/components/FeaturedGameCard';

/* Skeleton con la silueta del carrusel de Destacados: tarjeta activa
   expandida (carátula 200px + panel de info) al centro y carátulas
   comprimidas a los lados. Mismas alturas que FeaturedGameCard y mismo
   padding vertical que el track del carrusel, para que el reemplazo
   skeleton ↔ carrusel no mueva el layout — de ahí el `compact`, que en
   mobile baja el alto al de la tarjeta compacta. */
function FeaturedCarouselSkeleton({ compact }: { compact: boolean }) {
    const height = compact ? CARD_HEIGHT_COMPACT : CARD_HEIGHT;
    return (
        <Group justify="center" align="center" gap={70} wrap="nowrap" pt={12} pb={8} style={{ overflow: 'hidden' }}>
            <Skeleton radius="lg" height={height} width={200} style={{ flexShrink: 0 }} visibleFrom="md" />
            <Skeleton radius="lg" height={height} style={{ width: 'min(520px, 100%)', flexShrink: 0 }} />
            <Skeleton radius="lg" height={height} width={200} style={{ flexShrink: 0 }} visibleFrom="md" />
        </Group>
    );
}

/* Loop manual: en vez de dejar que Embla clone los extremos internamente
   (`loop`), se agregan a mano copias de los últimos y primeros juegos en los
   bordes (`padded`, más abajo). Cruzar hacia una copia es una transición
   normal — se anima igual que cualquier otro click. Una vez asentado sobre la
   copia, se reubica en silencio (sin animación) sobre el juego real
   equivalente, que es visualmente idéntico, así que el salto es
   imperceptible. Intentar animar el salto interno que hace `loop` por su
   cuenta (probado en una versión anterior) se veía como si el carrusel entero
   "se devolviera" hasta el principio.
   Se clonan 2 juegos de cada lado (no solo 1): con un click rápido y
   sucesivo, un solo clon de colchón no alcanza a corregirse antes de que el
   siguiente click intente cruzar OTRA VEZ el límite — con `loop={false}` eso
   deja al carrusel sin más adónde ir (atascado). Dos clones dan margen para
   un par de clicks rápidos seguidos. */
const CLONE_COUNT = 2;

/**
 * Carrusel "coverflow" de juegos destacados: la tarjeta centrada se ve
 * expandida y las laterales comprimidas a la carátula. Lo usan "Juegos
 * Destacados" del home y "Destacados de la saga", que tienen que verse igual.
 *
 * `loading` superpone el skeleton (sin desmontar el carrusel) mientras el
 * padre vuelve a pedir los juegos, p. ej. al cambiar un filtro global.
 */
export default function FeaturedGamesCarousel({ games, loading = false }: { games: Game[]; loading?: boolean }) {
    /* El efecto coverflow (tarjeta activa expandida de 520px, laterales
       comprimidas a la carátula) está construido con anchos fijos y no cabe
       en el slot de mobile, donde la tarjeta activa terminaba desbordando la
       pantalla y la animación "se pasaba" de posición. Bajo `md` se usa el
       layout compacto: una tarjeta por pantalla, siempre expandida y sin
       animaciones de ancho ni translateX. Es una decisión de layout que vive
       en JS (no alcanza con visibleFrom/hiddenFrom), de ahí el media query.
       `undefined` en SSR y en el primer render → desktop; ese frame queda
       tapado por el skeleton (`ready`). */
    const isDesktop = useMediaQuery('(min-width: 62em)');
    const compact = isDesktop === false;

    /* Embla mide su contenedor y recién ahí centra la tarjeta activa; hasta
       entonces se ve alineada a la izquierda. Se oculta con un fade breve para
       no mostrar ese salto. */
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let idInner: number | null = null;
        const idOuter = requestAnimationFrame(() => {
            idInner = requestAnimationFrame(() => setReady(true));
        });
        /* requestAnimationFrame NO corre en una pestaña en segundo plano:
           abrir la página con "abrir en pestaña nueva" dejaba el carrusel
           oculto hasta que la pestaña se mostraba. El timer sí corre ahí, así
           que actúa de red de seguridad; en la pestaña visible siempre gana el
           doble rAF, que es más rápido. */
        const idFallback = setTimeout(() => setReady(true), 300);
        return () => {
            cancelAnimationFrame(idOuter);
            if (idInner !== null) cancelAnimationFrame(idInner);
            clearTimeout(idFallback);
        };
    }, []);

    /* Siempre guarda el índice REAL dentro de `games` (nunca el índice de
       Embla, que incluye los clones). */
    const [activeIndex, setActiveIndex] = useState(0);

    /* @mantine/carousel expone una prop `speed`, pero es un remanente de la
       API de Embla v7 (donde era un multiplicador de fricción); el paquete
       instalado es embla-carousel v8, que renombró esa opción a `duration`
       — `speed` llega a Embla como una key que no reconoce y no hace nada.
       Aun corrigiéndolo con `duration` real, Embla converge en ~100-150ms
       para saltar a la tarjeta adyacente sin importar el valor (afecta más a
       distancias largas), mucho más rápido que la animación de expandir la
       tarjeta (~0.7s) — por eso se sentía "sin transición".
       Solución: una transición CSS sobre el transform del track, mostrando
       recién ahí el movimiento a la misma velocidad que la tarjeta. Debe
       activarse SOLO al usar las flechas, nunca durante el arrastre (si el
       track tuviera esta transición todo el tiempo, el drag se vería con lag,
       siguiendo al mouse con retraso, en vez de responder en vivo). */
    const [transitioning, setTransitioning] = useState(false);
    const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerTransition = () => {
        setTransitioning(true);
        if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
        transitionTimeout.current = setTimeout(() => setTransitioning(false), 800);
    };

    const emblaApi = useRef<EmblaCarouselType | null>(null);
    const correctionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleEmblaApi = (api: EmblaCarouselType) => {
        /* Mientras el track hace la transición CSS de arriba, la tarjeta
           activa también está cambiando de ancho (comprimida ↔ expandida) —
           Embla observa el tamaño de las tarjetas por defecto (`watchResize`)
           y recalcula la geometría del carrusel en pleno vuelo, lo que se veía
           como un freno a mitad de camino seguido de un salto. El carrusel
           tiene un número fijo de tarjetas con `slideSize` fijo por
           breakpoint, así que no necesita ese watcher. */
        api.reInit({ watchResize: false });
        emblaApi.current = api;
    };

    const n = games.length;
    /* Traduce el índice de Embla (que recorre también los clones de los
       bordes) al índice REAL dentro de `games`: un clon "hereda" el estado
       del juego que representa. */
    const realIndexOf = (paddedIndex: number) =>
        paddedIndex < CLONE_COUNT
            ? (n - CLONE_COUNT + paddedIndex) % n
            : paddedIndex >= CLONE_COUNT + n
                ? paddedIndex - (CLONE_COUNT + n)
                : paddedIndex - CLONE_COUNT;

    const handleSlideChange = (paddedIndex: number) => {
        /* Con 0 o 1 juego no hay clones (`padded` es `games` tal cual): el
           índice de Embla ya es el real, sin traducción ni corrección. */
        if (n <= 1) {
            setActiveIndex(paddedIndex);
            return;
        }
        const realIndex = realIndexOf(paddedIndex);
        setActiveIndex(realIndex);

        /* Cancela cualquier corrección pendiente de un click anterior: si el
           usuario hizo varios clicks rápidos seguidos, solo debe sobrevivir la
           corrección hacia la posición donde terminó asentado, no una vieja
           apuntando a una posición ya superada. */
        if (correctionTimeout.current) clearTimeout(correctionTimeout.current);
        if (paddedIndex < CLONE_COUNT || paddedIndex >= CLONE_COUNT + n) {
            /* Espera un poco más que el apagado de la transición CSS (800ms)
               para no arriesgarse a que el salto silencioso ocurra mientras
               esa transición sigue activa, lo que lo animaría. */
            correctionTimeout.current = setTimeout(() => {
                emblaApi.current?.scrollTo(CLONE_COUNT + realIndex, true);
            }, 850);
        }
    };
    useEffect(() => () => {
        if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
        if (correctionTimeout.current) clearTimeout(correctionTimeout.current);
    }, []);

    /* Clones a mano en los bordes para el loop manual. Usa módulo para no
       romperse si hay menos juegos que clones deseados. */
    const padded =
        n > 1
            ? [
                ...Array.from({ length: CLONE_COUNT }, (_, i) => games[(n - CLONE_COUNT + i + n) % n]),
                ...games,
                ...Array.from({ length: CLONE_COUNT }, (_, i) => games[i % n]),
            ]
            : games;

    return (
        <Box pos="relative">
            {/* Skeleton superpuesto (no reemplaza al carrusel en el árbol:
                desmontarlo re-inicializaría Embla y volvería el salto de
                centrado que este gating evita). Cubre la espera de hidratación
                inicial y el refetch del padre. */}
            {(!ready || loading) && (
                /* `pointerEvents: none` no es decorativo: este Box cubre el
                   carrusel entero con `inset: 0`, así que mientras esté montado
                   se come TODOS los clics de las tarjetas. Sin él, cualquier
                   demora en apagarlo se ve como "el juego no es clickeable" en
                   vez de como un skeleton lento. */
                <Box pos="absolute" style={{ inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                    <FeaturedCarouselSkeleton compact={compact} />
                </Box>
            )}
            <Box style={{ opacity: ready && !loading ? 1 : 0, transition: 'opacity 0.25s ease' }}>
                <Carousel
                    /* En mobile: una tarjeta completa por pantalla y un gap
                       normal — 70px era ~20% del ancho de un teléfono. */
                    slideSize={{ base: '100%', md: '58%' }}
                    slideGap={{ base: 'md', md: '70px' }}
                    align="center"
                    loop={false}
                    initialSlide={n > 1 ? CLONE_COUNT : 0}
                    withIndicators={false}
                    /* Sin flechas en mobile: se navega con swipe, y así tampoco
                       se activa la transición CSS del track (ver
                       `triggerTransition`), cuyo apagado por timer se veía como
                       un salto seco en pantallas chicas. */
                    withControls={!compact}
                    controlsOffset="-20px"
                    getEmblaApi={handleEmblaApi}
                    onSlideChange={handleSlideChange}
                    previousControlProps={{ onClick: triggerTransition }}
                    nextControlProps={{ onClick: triggerTransition }}
                    styles={{
                        container: {
                            paddingTop: 12,
                            paddingBottom: 8,
                            transition: !compact && transitioning ? 'transform 0.7s ease' : 'none',
                        },
                        controls: { zIndex: 3 },
                    }}
                >
                    {padded.map((g, paddedIndex) => {
                        const realIndex = n > 1 ? realIndexOf(paddedIndex) : paddedIndex;
                        return (
                            <Carousel.Slide key={`${g.id}-${paddedIndex}`}>
                                <FeaturedGameCard
                                    game={g}
                                    compact={compact}
                                    isActive={realIndex === activeIndex}
                                    priority={realIndex === activeIndex}
                                    /* Distancia circular (no un simple index <
                                       active): con loop, comparar índices
                                       lineales clasifica mal a la tarjeta que da
                                       la vuelta (ej. si la activa es la 0, la
                                       última técnicamente tiene índice mayor
                                       pero visualmente está "antes", a la
                                       izquierda). */
                                    side={
                                        realIndex === activeIndex
                                            ? 'active'
                                            : (realIndex - activeIndex + n) % n <= n / 2
                                                ? 'after'
                                                : 'before'
                                    }
                                />
                            </Carousel.Slide>
                        );
                    })}
                </Carousel>
            </Box>
        </Box>
    );
}
