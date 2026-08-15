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
import { IconExternalLink, IconChevronRight, IconHome, IconMapPin } from '@tabler/icons-react';
import Link from 'next/link';

import type { Seller } from '@/lib/types';

export default function StoreClient({ initialSeller }: { initialSeller: Seller }) {
    const seller = initialSeller;
    const addresses = seller.addresses ?? [];

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
