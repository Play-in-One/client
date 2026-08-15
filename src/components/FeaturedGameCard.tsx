'use client';

import { useLayoutEffect, useRef, useState, memo } from 'react';
import { Card, Text, Group, Box, Anchor, Badge } from '@mantine/core';
import { IconStarFilled } from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import PlatformBadge from './PlatformBadge';
import { formatCLP } from '@/lib/utils';
import { trackEvent } from '@/lib/api';
import { decorative } from '@/lib/colors';
import type { Game } from '@/lib/types';

const PLACEHOLDER = '/placeholder-game.png';
const CARD_HEIGHT = 300;
const IMAGE_WIDTH = 200;
const INFO_WIDTH = 320;

function FeaturedGameCard({
    game,
    isActive,
    side,
}: {
    game: Game;
    isActive: boolean;
    /** Posición respecto a la tarjeta activa: controla hacia qué borde de su
     * slot (dimensionado para la tarjeta expandida) se pega la carátula
     * comprimida, para que quede junto a la tarjeta central en vez de
     * flotar centrada con un hueco vacío de cada lado. */
    side: 'before' | 'active' | 'after';
}) {
    const [imgSrc, setImgSrc] = useState(game.image || PLACEHOLDER);
    const hasPrice = game.min_price !== null;

    /* `justify-content` no es animable (cambiarlo saltaba en seco), así que
       se desplaza con `transform`. Pero los porcentajes dentro de
       `translateX()` se resuelven contra el ancho del PROPIO elemento, no
       el del contenedor — usar `var(--carousel-slide-size)` (un valor en
       %) ahí adentro nunca calculó el ancho real del slot, lo que dejaba
       la carátula mal desplazada y parcialmente cortada por el viewport
       del carrusel. Se mide el ancho real del slot (el padre del Anchor)
       en píxeles y se calcula el corrimiento en JS. */
    const anchorRef = useRef<HTMLAnchorElement>(null);
    const [slotWidth, setSlotWidth] = useState(0);
    useLayoutEffect(() => {
        const slot = anchorRef.current?.parentElement;
        if (!slot) return;
        const update = () => setSlotWidth(slot.getBoundingClientRect().width);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(slot);
        return () => observer.disconnect();
    }, []);

    const shiftPx =
        side === 'active' || !slotWidth
            ? 0
            : side === 'before'
                ? (slotWidth - IMAGE_WIDTH) / 2
                : (IMAGE_WIDTH - slotWidth) / 2;

    return (
        <Anchor
            ref={anchorRef}
            component={Link}
            href={`/game/${game.id}`}
            underline="never"
            style={{
                textDecoration: 'none',
                display: 'flex',
                justifyContent: 'center',
                transform: `translateX(${shiftPx}px)`,
                transition: 'transform 0.7s ease',
            }}
            onClick={() => trackEvent({ event_type: 'game_click', game: game.id })}
        >
            <Card
                shadow="sm"
                radius="lg"
                withBorder
                padding={0}
                pos="relative"
                style={{
                    overflow: 'hidden',
                    height: CARD_HEIGHT,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.3s, transform 0.3s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '';
                    e.currentTarget.style.transform = '';
                }}
            >
                {/* Blob de acento, igual al del hero (decorative.heroBlobRed) */}
                <Box
                    pos="absolute"
                    top={-60}
                    right={-60}
                    w={220}
                    h={220}
                    style={{
                        borderRadius: '50%',
                        background: decorative.heroBlobRed,
                        filter: 'blur(60px)',
                        pointerEvents: 'none',
                    }}
                />

                <Box pos="relative" style={{ zIndex: 1, display: 'flex', flexDirection: 'row', height: '100%' }}>
                    {/* Carátula: siempre visible, ancho fijo */}
                    <Box pos="relative" style={{ width: IMAGE_WIDTH, flexShrink: 0, height: '100%' }}>
                        <Image
                            src={imgSrc}
                            alt={game.name}
                            fill
                            sizes={`${IMAGE_WIDTH}px`}
                            unoptimized
                            style={{ objectFit: 'cover' }}
                            onError={() => { if (imgSrc !== PLACEHOLDER) setImgSrc(PLACEHOLDER); }}
                        />
                    </Box>

                    {/* Info: solo la tarjeta activa (centrada) la muestra; las
                        laterales la comprimen a 0 y quedan reducidas a la
                        carátula. Anima al pasar de una a otra. */}
                    <Box
                        style={{
                            width: isActive ? INFO_WIDTH : 0,
                            padding: isActive ? 'var(--mantine-spacing-lg)' : 0,
                            opacity: isActive ? 1 : 0,
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0,
                            transition: 'width 0.7s ease, padding 0.7s ease, opacity 0.5s ease',
                        }}
                    >
                        <Group gap={6} mb={10} wrap="nowrap" style={{ whiteSpace: 'nowrap' }}>
                            {game.platforms.map((p) => (
                                <PlatformBadge key={p.id} platform={p} />
                            ))}
                            {game.on_sale && (
                                <Badge color="primaryRed" variant="light" size="sm">Oferta</Badge>
                            )}
                            {game.rating && (
                                <Group gap={4} ml="auto" wrap="nowrap">
                                    <IconStarFilled size={14} style={{ color: '#f5b400', flexShrink: 0 }} />
                                    <Text fz="sm" fw={700}>{game.rating}</Text>
                                </Group>
                            )}
                        </Group>

                        <Text fw={700} fz="xl" lineClamp={2} style={{ whiteSpace: 'normal' }}>
                            {game.name}
                        </Text>
                        <Text fz="sm" c="dimmed" mb={10} style={{ whiteSpace: 'nowrap' }}>
                            {game.developer || 'Desarrollador desconocido'}
                        </Text>
                        <Text fz="sm" c="dimmed" lineClamp={3} style={{ flex: 1, whiteSpace: 'normal' }}>
                            {game.featured_description}
                        </Text>

                        {hasPrice && (
                            <Text fz={24} fw={800} c="var(--mantine-color-primaryRed-5)" mt="auto" style={{ whiteSpace: 'nowrap' }}>
                                {formatCLP(game.min_price as string)}
                            </Text>
                        )}
                    </Box>
                </Box>
            </Card>
        </Anchor>
    );
}

export default memo(FeaturedGameCard);
