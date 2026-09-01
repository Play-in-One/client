'use client';

import {
    Container,
    Title,
    Text,
    Box,
    Group,
    Card,
    Anchor,
    Breadcrumbs,
    Stack,
} from '@mantine/core';
import { useEffect, useRef } from 'react';
import { IconExternalLink, IconChevronRight, IconHome, IconMapPin, IconTruck } from '@tabler/icons-react';
import Link from 'next/link';

import SellerScopeBadge from '@/components/SellerScopeBadge';
import { formatCLP } from '@/lib/utils';
import { trackEvent } from '@/lib/api';
import { useConsent } from '@/context/ConsentContext';
import type { Seller } from '@/lib/types';

export default function StoreClient({
    initialSeller,
    summary = null,
}: {
    initialSeller: Seller;
    /** Frase citable armada en el servidor, la misma que la meta description.
     *  Sobrevive a la retirada de la galería porque es una afirmación sobre la
     *  tienda —cuántos juegos tiene y cuál es el más barato—, no una lista: la
     *  página la muestra, así que no hay nada que no respalde. */
    summary?: string | null;
}) {
    const seller = initialSeller;
    const addresses = seller.addresses ?? [];
    const shippingCost = parseFloat(seller.shipping_cost ?? '0');

    /* ── Popularity tracking ──
       El page_view del layout registra `/store/[id]`, normalizado: no dice QUÉ
       tienda. Y el enlace de abajo es la salida al vendedor — la conversión
       del sitio, que hasta ahora no dejaba rastro de ningún tipo. */
    const { ready } = useConsent();
    const viewedSeller = useRef<number | null>(null);
    useEffect(() => {
        if (!ready || viewedSeller.current === seller.id) return;
        viewedSeller.current = seller.id;
        trackEvent({ event_type: 'store_view', seller: seller.id });
    }, [seller.id, ready]);

    return (
        <Container size="lg" py="xl">
            <Breadcrumbs
                separator={<IconChevronRight size={14} color="var(--mantine-color-dimmed)" />}
                mb="xl"
                fz="sm"
            >
                <Anchor component={Link} href="/" c="dimmed" underline="never">
                    <Group gap={4}><IconHome size={14} /> Inicio</Group>
                </Anchor>
                <Text fw={500}>{seller.name}</Text>
            </Breadcrumbs>

            {/* Header: icon + name */}
            <Group gap="md" mb="lg" align="center">
                <Box
                    w={56}
                    h={56}
                    style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--mantine-color-default-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--mantine-color-gray-0)',
                        flexShrink: 0,
                    }}
                >
                    {(seller.favicon || seller.logo) ? (
                        <img
                            src={seller.favicon || seller.logo || ''}
                            alt={seller.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <Text fw={700}>{seller.name.slice(0, 2).toUpperCase()}</Text>
                    )}
                </Box>
                <Box style={{ flex: 1 }}>
                    <Group gap="sm" align="center">
                        <Title order={1} fz={{ base: 24, md: 32 }} fw={800}>
                            {seller.name}
                        </Title>
                        <SellerScopeBadge seller={seller} size={22} />
                    </Group>
                    {seller.url && (
                        <Anchor
                            href={seller.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            fz="sm"
                            c="dimmed"
                            onClick={() => trackEvent({ event_type: 'store_click', seller: seller.id })}
                        >
                            <Group gap={4}>
                                {seller.url} <IconExternalLink size={14} />
                            </Group>
                        </Anchor>
                    )}
                </Box>
            </Group>

            <Stack gap="lg">
                {/* Description */}
                <Card withBorder radius="lg" p="lg">
                    <Text fw={700} mb="xs">Acerca de la tienda</Text>
                    <Text fz="sm" c="dimmed" lh={1.6}>
                        {seller.description || summary || 'Sin descripción disponible.'}
                    </Text>
                </Card>

                {/* Envío: explica de dónde sale el sobreprecio que la plataforma
                    suma a todas las ofertas de esta tienda. */}
                <Card withBorder radius="lg" p="lg">
                    <Group gap="xs" mb="xs">
                        <IconTruck size={18} color="var(--mantine-color-primaryRed-5)" />
                        <Text fw={700}>Envío</Text>
                    </Group>
                    {shippingCost > 0 ? (
                        <Text fz="sm" c="dimmed" lh={1.6}>
                            Sus precios se muestran con un envío promedio de{' '}
                            <Text span fw={700} c="var(--mantine-color-text)">
                                {formatCLP(shippingCost)}
                            </Text>{' '}
                            ya incluido, para que se puedan comparar con los de cualquier otra tienda.
                        </Text>
                    ) : (
                        <Text fz="sm" c="dimmed" lh={1.6}>
                            Sin costo de envío registrado: sus precios se muestran tal como aparecen en la tienda.
                        </Text>
                    )}
                </Card>

                {/* Addresses */}
                <Card withBorder radius="lg" p="lg">
                    <Text fw={700} mb="md">Sucursales</Text>
                    {addresses.length === 0 ? (
                        <Text fz="sm" c="dimmed">No hay sucursales registradas.</Text>
                    ) : (
                        <Stack gap="sm">
                            {addresses.map((a) => (
                                <Group key={a.id} gap="xs" align="flex-start" wrap="nowrap">
                                    <IconMapPin size={16} style={{ marginTop: 2, flexShrink: 0 }} color="var(--mantine-color-primaryRed-5)" />
                                    <Box>
                                        {a.label && <Text fz="sm" fw={600}>{a.label}</Text>}
                                        <Text fz="sm" c="dimmed">{a.address}</Text>
                                    </Box>
                                </Group>
                            ))}
                        </Stack>
                    )}
                </Card>

            </Stack>
        </Container>
    );
}
