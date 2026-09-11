'use client';

import { useState } from 'react';
import { Modal, Stack, Group, Text, Button, Paper, ActionIcon, Tooltip } from '@mantine/core';
import { IconCopy, IconCheck, IconGift } from '@tabler/icons-react';
import { formatCLP } from '@/lib/utils';
import type { Seller } from '@/lib/types';
import { activeCoupon } from '@/lib/types';
import { computeCouponSavings } from './CouponInfo';

export interface PendingOffer {
    url: string;
    productId: number;
    platformId?: number;
    seller: Seller;
    basePrice: string | number | null;
}

interface Props {
    offer: PendingOffer | null;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Popup que se interpone antes de salir hacia una tienda con convenio: muestra
 * el código de cupón para que el usuario lo use en el carrito de la tienda
 * externa. Solo se monta cuando `offer` trae un seller con cupón activo — los
 * 4 puntos de salida de GameDetailClient ya filtran eso antes de abrirlo.
 */
export default function CouponModal({ offer, onClose, onConfirm }: Props) {
    const [copied, setCopied] = useState(false);

    const coupon = offer ? activeCoupon(offer.seller) : null;
    const savings = offer ? computeCouponSavings(offer.basePrice, coupon) : null;

    const handleCopy = async () => {
        if (!coupon) return;
        try {
            await navigator.clipboard.writeText(coupon.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard write blocked */ }
    };

    return (
        <Modal
            opened={!!offer && !!coupon}
            onClose={onClose}
            centered
            radius="lg"
            title={
                <Group gap={6}>
                    <IconGift size={20} />
                    <Text fw={700}>¡Esta tienda tiene cupón!</Text>
                </Group>
            }
        >
            {offer && coupon && (
                <Stack gap="md">
                    {savings && (
                        <Stack gap={0}>
                            <Text size="xl">
                                Ahorra <Text component="span" fw={700} c="green">{formatCLP(savings.savings)}</Text> utilizando un cupón !!
                            </Text>
                            <Text fz="sm">De {formatCLP(savings.base)} a {formatCLP(savings.discounted)}.</Text>
                        </Stack>
                    )}
                    <Text fz="sm" c="dimmed">
                        Usa el siguiente código en el carrito de {offer.seller.name}:
                    </Text>


                    <Paper withBorder radius="md" p="sm" style={{ position: 'relative' }}>
                        <Text ta="center" fz="xl" fw={700} ff="monospace" style={{ letterSpacing: 1 }}>
                            {coupon.code}
                        </Text>
                        <Tooltip label={copied ? '¡Copiado!' : 'Copiar código'} withArrow>
                            <ActionIcon
                                variant="light"
                                size="lg"
                                onClick={handleCopy}
                                aria-label="Copiar código"
                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                            >
                                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                            </ActionIcon>
                        </Tooltip>
                    </Paper>

                    <Group justify="center" mt="xs">
                        <Button variant="default" radius="lg" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button color="primaryRed" radius="lg" onClick={onConfirm}>
                            Tienda
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}
