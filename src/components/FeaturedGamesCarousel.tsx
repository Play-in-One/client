'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';
import { ActionIcon, Box, Group, Skeleton, UnstyledButton } from '@mantine/core';
import { useMediaQuery, useReducedMotion } from '@mantine/hooks';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
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
   Dos clones a cada lado dejan margen para avanzar de nuevo mientras se
   completa el movimiento anterior. La corrección espera al evento `settle`
   de Embla, sin interrumpir el arrastre ni la inercia. */
const CLONE_COUNT = 2;
const AUTOPLAY_DELAY = 5000;

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
       `undefined` en SSR y en el primer render → desktop; el viewport
       limita el ancho hasta que se resuelve el media query. */
    const isDesktop = useMediaQuery('(min-width: 62em)');
    const compact = isDesktop === false;
    const reducedMotion = useReducedMotion();
    const [autoplayPaused, setAutoplayPaused] = useState(false);

    /* Las tarjetas originales son visibles en SSR. Los clones se agregan
       después de hidratar y medir el contenedor de Embla. */
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let idInner: number | null = null;
        const idOuter = requestAnimationFrame(() => {
            idInner = requestAnimationFrame(() => setReady(true));
        });
        /* requestAnimationFrame NO corre en una pestaña en segundo plano:
           el timer permite preparar los clones también en segundo plano, así
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

    /* Embla es el único encargado del desplazamiento. Una transición CSS
       sobre su transform retrasaba cada frame y cortaba el arrastre. Mantine
       7 todavía expone `speed`; Embla 8 requiere configurar `duration`. */
    const emblaApi = useRef<EmblaCarouselType | null>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const wheelAvailableAt = useRef(0);
    const handleEmblaApi = useCallback((api: EmblaCarouselType) => {
        // Mantine vuelve a invocar este callback al seleccionar una tarjeta.
        // Reinicializar ahí detendría la animación que acaba de comenzar.
        if (emblaApi.current === api) return;
        emblaApi.current = api;
        api.reInit({ watchResize: false, duration: 25 });
    }, []);

    const n = games.length;
    const cloneCount = ready && n > 1 ? CLONE_COUNT : 0;
    useEffect(() => {
        const api = emblaApi.current;
        if (!api) return;
        api.reInit({ startIndex: cloneCount, watchResize: false, duration: 25 });
        api.scrollTo(cloneCount, true);
    }, [cloneCount, n]);

    useEffect(() => {
        const api = emblaApi.current;
        if (!api || !ready) return;
        const viewport = api.rootNode();
        let width = viewport.clientWidth;
        // Recalcular al girar el teléfono, sin observar el ancho animado de
        // las tarjetas (eso volvería a cortar la transición del coverflow).
        const observer = new ResizeObserver(() => {
            if (viewport.clientWidth === width) return;
            width = viewport.clientWidth;
            const index = api.selectedScrollSnap();
            api.reInit({ startIndex: index, watchResize: false, duration: 25 });
            api.scrollTo(index, true);
        });
        observer.observe(viewport);
        return () => observer.disconnect();
    }, [ready]);

    useEffect(() => {
        const api = emblaApi.current;
        if (!api || !ready || compact) return;
        let slides = api.slideNodes();
        let snaps = api.scrollSnapList();
        const syncCards = () => {
            const progress = api.scrollProgress();
            slides.forEach((slide, index) => {
                const delta = snaps[index] - progress;
                const gap = delta >= 0
                    ? snaps[index] - (snaps[index - 1] ?? snaps[index] - 1)
                    : (snaps[index + 1] ?? snaps[index] + 1) - snaps[index];
                const distance = Math.max(-1, Math.min(1, delta / (gap || 1)));
                // La expansión, la opacidad y el corrimiento usan la posición
                // real del track, también durante drag, inversión y autoplay.
                // Sin timers, transiciones CSS ni renders React por frame.
                slide.style.setProperty('--featured-open', String(1 - Math.abs(distance)));
                slide.style.setProperty('--featured-distance', String(distance));
            });
        };
        const reInit = () => {
            slides = api.slideNodes();
            snaps = api.scrollSnapList();
            syncCards();
        };
        syncCards();
        api.on('scroll', syncCards).on('settle', syncCards).on('reInit', reInit);
        return () => {
            api.off('scroll', syncCards).off('settle', syncCards).off('reInit', reInit);
            slides.forEach((slide) => {
                slide.style.removeProperty('--featured-open');
                slide.style.removeProperty('--featured-distance');
            });
        };
    }, [ready, compact, cloneCount, n]);

    /* Traduce el índice de Embla (que recorre también los clones de los
       bordes) al índice REAL dentro de `games`: un clon "hereda" el estado
       del juego que representa. */
    const realIndexOf = (paddedIndex: number) =>
        paddedIndex < cloneCount
            ? (n - cloneCount + paddedIndex) % n
            : paddedIndex >= cloneCount + n
                ? paddedIndex - (cloneCount + n)
                : paddedIndex - cloneCount;

    const handleSlideChange = (paddedIndex: number) => {
        /* Con 0 o 1 juego no hay clones (`padded` es `games` tal cual): el
           índice de Embla ya es el real, sin traducción ni corrección. */
        if (n <= 1 || !cloneCount) {
            setActiveIndex(paddedIndex);
            return;
        }
        const realIndex = realIndexOf(paddedIndex);
        setActiveIndex(realIndex);
    };

    useEffect(() => {
        const api = emblaApi.current;
        if (!api) return;
        const settle = () => {
            const index = api.selectedScrollSnap();
            if (cloneCount && (index < cloneCount || index >= cloneCount + n)) {
                // Corregir solo cuando el movimiento terminó, nunca por un
                // temporizador que pueda interrumpir la inercia del mouse.
                api.scrollTo(cloneCount + ((index - cloneCount + n) % n), true);
            }
        };
        api.on('settle', settle);
        return () => { api.off('settle', settle); };
    }, [cloneCount, n]);

    useEffect(() => {
        const element = carouselRef.current;
        if (!element || !ready || loading || n <= 1) return;
        let accumulated = 0;
        let lastWheelAt = 0;
        const onWheel = (event: WheelEvent) => {
            const api = emblaApi.current;
            if (!api || event.ctrlKey) return;
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            event.preventDefault();
            const now = performance.now();
            if (now - lastWheelAt > 180 || Math.sign(accumulated) !== Math.sign(delta)) accumulated = 0;
            lastWheelAt = now;
            // Un gesto avanza una tarjeta; la inercia del trackpad no debe
            // encadenar selecciones mientras la anterior sigue moviéndose.
            if (now < wheelAvailableAt.current) return;
            accumulated += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
            if (Math.abs(accumulated) < 36) return;
            wheelAvailableAt.current = now + 900;
            if (accumulated > 0) api.scrollNext();
            else api.scrollPrev();
            accumulated = 0;
        };
        element.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            element.removeEventListener('wheel', onWheel);
            wheelAvailableAt.current = 0;
        };
    }, [loading, n, ready]);

    useEffect(() => {
        const element = carouselRef.current;
        const api = emblaApi.current;
        if (!element || !api || !ready || loading || n <= 1 || reducedMotion || autoplayPaused) return;

        let timer: ReturnType<typeof setTimeout> | undefined;
        let inView = false;
        let hovered = element.matches(':hover') && window.matchMedia('(hover: hover)').matches;
        let focused = element.contains(document.activeElement);
        let dragging = false;
        const schedule = () => {
            clearTimeout(timer);
            if (!inView || document.hidden || hovered || focused || dragging) return;
            timer = setTimeout(() => {
                api.scrollNext();
                schedule();
            }, AUTOPLAY_DELAY);
        };
        const enter = (event: PointerEvent) => {
            if (event.pointerType === 'mouse') { hovered = true; schedule(); }
        };
        const leave = () => { hovered = false; schedule(); };
        const focusIn = () => { focused = true; schedule(); };
        const focusOut = (event: FocusEvent) => {
            focused = event.relatedTarget instanceof Node && element.contains(event.relatedTarget);
            schedule();
        };
        const down = () => { dragging = true; schedule(); };
        const up = () => { dragging = false; schedule(); };
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            schedule();
        }, { threshold: [0, 0.5] });
        observer.observe(element);
        element.addEventListener('pointerenter', enter);
        element.addEventListener('pointerleave', leave);
        element.addEventListener('focusin', focusIn);
        element.addEventListener('focusout', focusOut);
        element.addEventListener('pointerdown', down);
        element.addEventListener('wheel', schedule, { passive: true });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        document.addEventListener('visibilitychange', schedule);
        api.on('select', schedule);
        return () => {
            clearTimeout(timer);
            observer.disconnect();
            element.removeEventListener('pointerenter', enter);
            element.removeEventListener('pointerleave', leave);
            element.removeEventListener('focusin', focusIn);
            element.removeEventListener('focusout', focusOut);
            element.removeEventListener('pointerdown', down);
            element.removeEventListener('wheel', schedule);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
            document.removeEventListener('visibilitychange', schedule);
            api.off('select', schedule);
        };
    }, [ready, loading, n, reducedMotion, autoplayPaused]);

    /* Clones a mano en los bordes para el loop manual. Usa módulo para no
       romperse si hay menos juegos que clones deseados. */
    const padded =
        cloneCount > 0
            ? [
                ...Array.from({ length: cloneCount }, (_, i) => games[(n - cloneCount + i + n) % n]),
                ...games,
                ...Array.from({ length: cloneCount }, (_, i) => games[i % n]),
            ]
            : games;

    return (
        <Box pos="relative" ref={carouselRef}>
            {/* Skeleton superpuesto (no reemplaza al carrusel en el árbol:
                desmontarlo re-inicializaría Embla y volvería el salto de
                centrado). Cubre el refetch del padre. */}
            {loading && (
                /* `pointerEvents: none` no es decorativo: este Box cubre el
                   carrusel entero con `inset: 0`, así que mientras esté montado
                   se come TODOS los clics de las tarjetas. Sin él, cualquier
                   demora en apagarlo se ve como "el juego no es clickeable" en
                   vez de como un skeleton lento. */
                <Box pos="absolute" style={{ inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                    <FeaturedCarouselSkeleton compact={compact} />
                </Box>
            )}
            <Box style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.25s ease' }}>
                <Carousel
                    /* En mobile asoma la siguiente tarjeta para invitar al swipe. */
                    slideSize={{ base: n > 1 ? '90%' : '100%', md: '58%' }}
                    slideGap={{ base: 12, md: '70px' }}
                    align={compact ? 'start' : 'center'}
                    loop={false}
                    initialSlide={n > 1 ? cloneCount : 0}
                    withIndicators={false}
                    /* En mobile se navega con swipe. */
                    withControls={!compact}
                    controlsOffset="-20px"
                    getEmblaApi={handleEmblaApi}
                    onSlideChange={handleSlideChange}
                    styles={{
                        container: {
                            paddingTop: 12,
                            paddingBottom: 8,
                            transition: 'none',
                        },
                        controls: { zIndex: 3 },
                    }}
                >
                    {padded.map((g, paddedIndex) => {
                        const realIndex = cloneCount ? realIndexOf(paddedIndex) : paddedIndex;
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
                {n > 1 && (
                    <Group justify="center" gap={8} mt={4} aria-label="Navegación de juegos destacados">
                        <Group gap={0}>
                            {games.map((game, index) => (
                                <UnstyledButton
                                    key={game.id}
                                    className="featured-carousel-indicator"
                                    aria-label={`Ver juego ${index + 1} de ${n}: ${game.name}`}
                                    aria-current={index === activeIndex ? 'true' : undefined}
                                    disabled={loading}
                                    onClick={() => emblaApi.current?.scrollTo(cloneCount + index)}
                                >
                                    <span className="featured-carousel-dot" data-active={index === activeIndex || undefined} />
                                </UnstyledButton>
                            ))}
                        </Group>
                        {!reducedMotion && (
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size={32}
                                radius="xl"
                                aria-label={autoplayPaused ? 'Reanudar avance automático' : 'Pausar avance automático'}
                                onClick={() => setAutoplayPaused((paused) => !paused)}
                            >
                                {autoplayPaused ? <IconPlayerPlay size={15} aria-hidden /> : <IconPlayerPause size={15} aria-hidden />}
                            </ActionIcon>
                        )}
                    </Group>
                )}
            </Box>
        </Box>
    );
}
