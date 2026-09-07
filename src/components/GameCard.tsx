'use client';

import { useState, useEffect, memo } from 'react';
import { Card, Text, Group, Box, Anchor, Checkbox } from '@mantine/core';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PlatformBadge from './PlatformBadge';
import DigitalBadge from './DigitalBadge';
import { isDigital } from '@/lib/conditions';
import ShippingInfo from './ShippingInfo';
import { formatCLP } from '@/lib/utils';
import { gamePath } from '@/lib/seo';
import { trackEvent } from '@/lib/api';
import type { Game, Product } from '@/lib/types';

const PLACEHOLDER = '/placeholder-game.png';

interface Props {
    game: Game;
    /** Optional best product to show price + seller info */
    bestProduct?: Product | null;
    /** Active console filter slug; if set, deep-links the game detail page to that console's panel */
    platformSlug?: string;
    /** Admin selection mode: click toggles selection instead of navigating. */
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (id: number) => void;
    /** Eager-load the image (LCP): set on the first few above-the-fold cards. */
    priority?: boolean;
}

function GameCard({ game, bestProduct, platformSlug, selectable, selected, onToggleSelect, priority }: Props) {
    const router = useRouter();
    // La portada se DERIVA del prop, no se copia a estado: ahora que sale del
    // producto más barato, cambia cuando el usuario cambia de filtro. Con
    // `useState(game.image)` el valor solo se leía en el primer render y la
    // imagen quedaba congelada, porque al re-fetchear la galería el juego
    // conserva su key y el componente no se remonta. El estado guarda solo el
    // fallo de carga, y se resetea cuando llega una portada distinta.
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [game.image]);
    const imgSrc = failed || !game.image ? PLACEHOLDER : game.image;

    /* Resolve price: prefer min_price from annotation, fall back to product */
    const price = game.min_price ?? bestProduct?.current_price ?? null;
    // El desglose sale de la MISMA fuente que el precio: mezclar el envío del
    // producto con el mínimo anotado (o al revés) mostraría un total que no
    // cuadra con la cifra de al lado.
    const [basePrice, shippingCost] = game.min_price !== null
        ? [game.min_price_base, game.min_price_shipping]
        : [bestProduct?.base_price ?? null, bestProduct?.shipping_cost ?? null];
    const seller = bestProduct?.seller ?? null;
    const hasPrice = price !== null;

    const trackGameClick = () => {
        const platformId = platformSlug
            ? game.platforms?.find((p) => p.slug === platformSlug)?.id
            : undefined;
        trackEvent({ event_type: 'game_click', game: game.id, platform: platformId });
    };

    // component={Link} usa el router de Next.js (transición client-side, sin
    // recarga completa). Un <a> plano forzaba un hard reload al abrir un
    // juego, que remonta AppProvider y muestra un instante sin el filtro de
    // condición mientras se relee de localStorage — de ahí el flash de
    // "todos los juegos". En modo selectable el click nunca navega
    // (preventDefault cancela la navegación de Link), así que el href es
    // solo un placeholder.
    const gameHref = gamePath(game, platformSlug);

    return (
        <Anchor
            component={Link}
            href={selectable ? '#' : gameHref}
            underline="never"
            style={{ textDecoration: 'none' }}
            onClick={(e) => {
                if (selectable) {
                    e.preventDefault();
                    onToggleSelect?.(game.id);
                    return;
                }
                trackGameClick();
            }}
        >
            <Card
                shadow="sm"
                radius="lg"
                withBorder
                padding={0}
                style={{
                    overflow: 'hidden',
                    transition: 'box-shadow 0.3s, transform 0.3s',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    cursor: 'pointer',
                    borderColor: selected ? 'var(--mantine-color-primaryRed-5)' : undefined,
                    boxShadow: selected ? '0 0 0 2px var(--mantine-color-primaryRed-5)' : undefined,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '';
                    e.currentTarget.style.transform = '';
                }}
            >
                {/* Image */}
                <Box pos="relative" style={{ aspectRatio: '3/4', overflow: 'hidden' }}>
                    <Image
                        src={imgSrc}
                        alt={game.name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px"
                        priority={priority}
                        /* Las portadas son URLs de CDNs externos de tiendas; varios
                           bloquean la descarga server-side del optimizador (403).
                           `unoptimized` las carga directo desde el navegador, como
                           el <img> original, conservando lazy-load y layout estable. */
                        unoptimized
                        style={{
                            objectFit: 'cover',
                            transition: 'transform 0.5s',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = ''; }}
                        onError={() => setFailed(true)}
                    />

                    {/* Overlay de selección (solo admin en modo fusión); visual, el
                        click de la tarjeta gestiona el toggle. */}
                    {selectable && (
                        <Box pos="absolute" top={8} left={8} style={{ zIndex: 2, pointerEvents: 'none' }}>
                            <Checkbox
                                checked={!!selected}
                                readOnly
                                color="primaryRed"
                                radius="sm"
                                size="md"
                                styles={{ input: { cursor: 'pointer' } }}
                            />
                        </Box>
                    )}

                    {/* La condición de la oferta que fija el precio mostrado.
                        Va arriba a la derecha porque arriba a la izquierda está
                        el checkbox de fusión, y sobre un fondo propio para que
                        se lea encima de cualquier carátula.

                        Sin `pointerEvents:'none'` (al revés que el overlay de
                        admin): el tooltip necesita hover y foco. Y con el click
                        cortado, porque la tarjeta entera es un <Link> y tocar
                        el emoji para leer el tooltip navegaría a la ficha. */}
                    {isDigital(game.min_price_condition) && (
                        <Box
                            pos="absolute"
                            top={8}
                            right={8}
                            px={4}
                            py={2}
                            style={{
                                zIndex: 2,
                                borderRadius: 'var(--mantine-radius-sm)',
                                background: 'rgba(0,0,0,0.55)',
                                lineHeight: 0,
                            }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            <DigitalBadge condition={game.min_price_condition} size={15} />
                        </Box>
                    )}
                </Box>

                {/* Info */}
                <Box p={{ base: 'xs', sm: 'sm' }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Group gap={4} mb="xs">
                        {game.platforms.map((p) => (
                            <PlatformBadge key={p.id} platform={p} />
                        ))}
                    </Group>

                    <Text fw={700} fz={{ base: 'sm', sm: 'md' }} lineClamp={2} mb={2}>
                        {game.name}
                    </Text>
                    <Text fz="xs" c="dimmed" mb="sm">
                        {game.developer || 'Desarrollador desconocido'}
                    </Text>

                    {/* Price row */}
                    {hasPrice && (
                        <Box
                            mt="auto"
                            pt="sm"
                            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                        >
                            <Group justify="space-between" align="flex-end">
                                <Box>
                                    <Group gap={2} wrap="nowrap" align="center">
                                        <Text fz={{ base: 18, sm: 26 }} fw={800} c="var(--mantine-color-primaryRed-5)">
                                            {formatCLP(price)}
                                        </Text>
                                        <ShippingInfo basePrice={basePrice} shippingCost={shippingCost} />
                                    </Group>
                                </Box>
                                <Box ta="right">
                                    {seller ? (
                                        <>
                                            <Text fz={10} c="dimmed">Vendido por</Text>
                                            <Group
                                                gap={4}
                                                justify="flex-end"
                                                wrap="nowrap"
                                                style={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (selectable) {
                                                        onToggleSelect?.(game.id);
                                                        return;
                                                    }
                                                    router.push(`/store/${seller.id}`);
                                                }}
                                            >
                                                {(seller.favicon || seller.logo) && (
                                                    <img
                                                        src={seller.favicon || seller.logo || ''}
                                                        alt={seller.name}
                                                        style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }}
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                )}
                                                <Text fz="xs" fw={700}>
                                                    {seller.name}
                                                </Text>
                                            </Group>
                                        </>
                                    ) : (
                                        <Text fz={10} c="dimmed">Precio más bajo</Text>
                                    )}
                                </Box>
                            </Group>
                        </Box>
                    )}
                </Box>
            </Card>
        </Anchor>
    );
}

export default memo(GameCard);
