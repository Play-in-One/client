'use client';

import { useEffect, useState } from 'react';
import { handleImageError } from '@/lib/imageFallback';
import { useParams } from 'next/navigation';
import {
    Container,
    Title,
    Text,
    Box,
    Group,
    Card,
    Anchor,
    Breadcrumbs,
    Loader,
    Stack,
} from '@mantine/core';
import { IconExternalLink, IconChevronRight, IconHome, IconMapPin } from '@tabler/icons-react';

import { getSeller } from '@/lib/api';
import type { Seller } from '@/lib/types';

export default function StoreDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getSeller(id)
            .then(setSeller)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <Container size="lg" py={80}>
                <Stack align="center"><Loader color="primaryRed" size="lg" /></Stack>
            </Container>
        );
    }

    if (!seller) {
        return (
            <Container size="lg" py={80}>
                <Stack align="center">
                    <Text fw={600} fz="lg">Tienda no encontrada</Text>
                </Stack>
            </Container>
        );
    }

    const addresses = seller.addresses ?? [];

    return (
        <Container size="lg" py="xl">
            <Breadcrumbs
                separator={<IconChevronRight size={14} color="var(--mantine-color-dimmed)" />}
                mb="xl"
                fz="sm"
            >
                <Anchor href="/" c="dimmed" underline="never">
                    <Group gap={4}><IconHome size={14} /> Inicio</Group>
                </Anchor>
                <Text fw={500}>{seller.name}</Text>
            </Breadcrumbs>

            {/* Banner */}
            <Box
                style={{
                    borderRadius: 'var(--mantine-radius-lg)',
                    overflow: 'hidden',
                    aspectRatio: '16/5',
                    background: 'var(--mantine-color-gray-1)',
                }}
                mb="lg"
            >
                <img
                    src={seller.banner || '/placeholder-store.png'}
                    alt={seller.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={handleImageError('/placeholder-store.png')}
                />
            </Box>

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
                    <Title order={1} fz={{ base: 24, md: 32 }} fw={800}>
                        {seller.name}
                    </Title>
                    {seller.url && (
                        <Anchor
                            href={seller.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            fz="sm"
                            c="dimmed"
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
                        {seller.description || 'Sin descripción disponible.'}
                    </Text>
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
