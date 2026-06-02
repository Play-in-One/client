'use client';

import { Card, Text, Group, Badge, Box, Anchor } from '@mantine/core';
import PlatformBadge from './PlatformBadge';
import { formatCLP } from '@/lib/utils';
import type { Game, Product } from '@/lib/types';

interface Props {
    game: Game;
    /** Optional best product to show price + seller info */
    bestProduct?: Product | null;
}

export default function GameCard({ game, bestProduct }: Props) {
    const imgSrc = game.image || '/placeholder-game.png';

    /* Resolve price: prefer min_price from annotation, fall back to product */
    const price = game.min_price ?? bestProduct?.current_price ?? null;
    const sellerName = bestProduct?.seller?.name ?? null;
    const hasPrice = price !== null;

    return (
        <Anchor href={`/game/${game.id}`} underline="never" style={{ textDecoration: 'none' }}>
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
                        onError={(e) => { e.currentTarget.src = '/placeholder-game.png'; }}
                    />

                    {/* Discount badge */}
                    {hasPrice && (
                        <Badge
                            color="green"
                            variant="filled"
                            size="sm"
                            pos="absolute"
                            top={12}
                            right={12}
                            style={{ zIndex: 2, fontWeight: 700 }}
                        >
                            Oferta
                        </Badge>
                    )}

                    {/* Platform badges overlay */}
                    <Box
                        pos="absolute"
                        bottom={0}
                        left={0}
                        right={0}
                        p="sm"
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        }}
                    >
                        <Group gap={4}>
                            {game.platforms.map((p) => (
                                <PlatformBadge key={p.id} platform={p} />
                            ))}
                        </Group>
                    </Box>
                </Box>

                {/* Info */}
                <Box p="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                                    {sellerName ? (
                                        <>
                                            <Text fz={10} c="dimmed">Vendido por</Text>
                                            <Text fz="xs" fw={700}>{sellerName}</Text>
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
