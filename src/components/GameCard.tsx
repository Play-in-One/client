'use client';

import { Card, Text, Group, Badge, Box, Anchor } from '@mantine/core';
import { useRouter } from 'next/navigation';
import PlatformBadge from './PlatformBadge';
import { formatCLP } from '@/lib/utils';
import { handleImageError } from '@/lib/imageFallback';
import type { Game, Product } from '@/lib/types';

interface Props {
    game: Game;
    /** Optional best product to show price + seller info */
    bestProduct?: Product | null;
    /** Active console filter slug; if set, deep-links the game detail page to that console's panel */
    platformSlug?: string;
}

export default function GameCard({ game, bestProduct, platformSlug }: Props) {
    const router = useRouter();
    const imgSrc = game.image || '/placeholder-game.png';

    /* Resolve price: prefer min_price from annotation, fall back to product */
    const price = game.min_price ?? bestProduct?.current_price ?? null;
    const seller = bestProduct?.seller ?? null;
    const hasPrice = price !== null;

    return (
        <Anchor href={`/game/${game.id}${platformSlug ? `?platform=${platformSlug}` : ''}`} underline="never" style={{ textDecoration: 'none' }}>
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
                    <img
                        src={imgSrc}
                        alt={game.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.5s',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = ''; }}
                        onError={handleImageError('/placeholder-game.png')}
                    />

                    {/* Discount badge */}
                    {hasPrice && (
                        <Badge
                            variant="gradient"
                            gradient={{ from: 'primaryRed', to: 'orange', deg: 90 }}
                            size="lg"
                            radius="xl"
                            pos="absolute"
                            top={12}
                            right={12}
                            style={{
                                zIndex: 2,
                                fontWeight: 700,
                                boxShadow: '0 4px 14px rgba(230,57,70,0.4)',
                            }}
                        >
                            Oferta
                        </Badge>
                    )}
                </Box>

                {/* Info */}
                <Box p="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Group gap={4} mb="xs">
                        {game.platforms.map((p) => (
                            <PlatformBadge key={p.id} platform={p} />
                        ))}
                    </Group>

                    <Text fw={700} fz="md" lineClamp={2} mb={2}>
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
                                    <Text fz="26" fw={800} c="var(--mantine-color-primaryRed-5)">
                                        {formatCLP(price)}
                                    </Text>
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
