'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Container,
    Title,
    Text,
    Box,
    Group,
    Badge,
    Button,
    Table,
    Card,
    Anchor,
    Breadcrumbs,
    Loader,
    Stack,
    ActionIcon,
    SimpleGrid,
    Select,
    useMantineColorScheme,
} from '@mantine/core';
import {
    IconBookmark,
    IconShare,
    IconExternalLink,
    IconTruck,
    IconStar,
    IconTag,
    IconChartLine,
    IconTableColumn,
    IconChevronRight,
    IconHome,
    IconCheck,
    IconDeviceGamepad,
    IconDeviceGamepad2,
    IconDeviceNintendo,
    IconDeviceDesktop,
} from '@tabler/icons-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';

import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';

import { getGame } from '@/lib/api';
import type { Game, Product } from '@/lib/types';
import { formatCLP, PLATFORM_COLORS } from '@/lib/utils';
import PlatformBadge from '@/components/PlatformBadge';

export default function GameDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [conditionFilter, setConditionFilter] = useState<string | null>(null);
    const [hoveredProductImage, setHoveredProductImage] = useState<string | null>(null);
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getGame(id)
            .then((g) => {
                setGame(g);
                if (g.platforms.length > 0) setSelectedPlatform(g.platforms[0].name);
            })
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

    if (!game) {
        return (
            <Container size="lg" py={80}>
                <Stack align="center">
                    <Text fw={600} fz="lg">Juego no encontrado</Text>
                </Stack>
            </Container>
        );
    }

    // Filter products
    const products = (game.products ?? []).filter((p) => {
        if (selectedPlatform && p.platform.name !== selectedPlatform) return false;
        if (conditionFilter && p.condition !== conditionFilter) return false;
        return true;
    });

    // Sort by price ascending
    const sorted = [...products].sort((a, b) => {
        const pa = parseFloat(a.current_price ?? '999999');
        const pb = parseFloat(b.current_price ?? '999999');
        return pa - pb;
    });

    const bestProduct = sorted[0] ?? null;
    const bestPrice = bestProduct ? parseFloat(bestProduct.current_price ?? '0') : 0;

    // Build mock price history chart data from products (demonstration)
    const chartData = sorted.map((p, i) => ({
        name: p.seller.name,
        price: parseFloat(p.current_price ?? '0'),
    }));

    // Seller initials color map
    const sellerColors = ['#7C3AED', '#2563EB', '#6366F1', '#6B7280', '#F97316'];

    const conditionLabel: Record<string, string> = {
        new: 'Nuevo',
        used: 'Usado',
        digital: 'Digital',
    };

    const conditionBadgeColor: Record<string, string> = {
        new: 'blue',
        used: 'yellow',
        digital: 'grape',
    };

    const platformIconMap: Record<string, any> = {
        ps5: FaPlaystation,
        ps4: FaPlaystation,
        ps3: FaPlaystation,
        xbox: FaXbox,
        switch: BsNintendoSwitch,
        switch2: BsNintendoSwitch,
        pc: IconDeviceDesktop,
        wii: IconDeviceNintendo,
        nds: IconDeviceGamepad2,
        '3ds': IconDeviceGamepad2,
        wiiu: IconDeviceNintendo,
    };



    return (
        <Container size="lg" py="xl">
            {/* Breadcrumbs */}
            <Breadcrumbs
                separator={<IconChevronRight size={14} color="var(--mantine-color-dimmed)" />}
                mb="xl"
                fz="sm"
            >
                <Anchor href="/" c="dimmed" underline="never">
                    <Group gap={4}><IconHome size={14} /> Inicio</Group>
                </Anchor>
                {game.platforms[0] && (
                    <Anchor href={`/search?platform=${game.platforms[0].slug}`} c="dimmed" underline="never">
                        {game.platforms[0].display_name}
                    </Anchor>
                )}
                <Text fw={500}>{game.name}</Text>
            </Breadcrumbs>

            {/* Main layout: sidebar + content */}
            <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="xl">
                {/* ── Sidebar: Cover + info ── */}
                <Box style={{ gridColumn: 'span 4' }}>
                    <Stack gap="md">
                        {/* Cover art */}
                        <Box
                            style={{
                                borderRadius: 'var(--mantine-radius-lg)',
                                overflow: 'hidden',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                                aspectRatio: '3/4',
                                position: 'relative',
                            }}
                        >
                            {/* Game image (base layer) */}
                            <img
                                src={game.image || '/placeholder-game.png'}
                                alt={game.name}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transition: 'opacity 0.4s ease',
                                    opacity: hoveredProductImage ? 0.3 : 1,
                                }}
                            />

                            {/* Product image (hover overlay) */}
                            {hoveredProductImage && (
                                <img
                                    src={hoveredProductImage}
                                    alt="Producto"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transition: 'opacity 0.4s ease',
                                        opacity: 1,
                                        zIndex: 1,
                                    }}
                                />
                            )}
                        </Box>

                        {/* Info card */}
                        <Card withBorder radius="lg" p="lg">
                            <Stack gap="xs">
                                {game.rating && (
                                    <Group justify="space-between" pb={8} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                                        <Text fz="sm" c="dimmed">Rating</Text>
                                        <Badge color="green" variant="light" size="sm">{game.rating}</Badge>
                                    </Group>
                                )}
                                {game.release_date && (
                                    <Group justify="space-between" pb={8} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                                        <Text fz="sm" c="dimmed">Lanzamiento</Text>
                                        <Text fz="sm" fw={500}>
                                            {new Date(game.release_date).toLocaleDateString('es-CL', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </Text>
                                    </Group>
                                )}
                                {game.developer && (
                                    <Group justify="space-between">
                                        <Text fz="sm" c="dimmed">Desarrollador</Text>
                                        <Text fz="sm" fw={500}>{game.developer}</Text>
                                    </Group>
                                )}
                            </Stack>
                        </Card>

                        {/* Description */}
                        {game.description && (
                            <Card withBorder radius="lg" p="lg">
                                <Text fw={700} mb="xs">Acerca del juego</Text>
                                <Text fz="sm" c="dimmed" lh={1.6}>
                                    {game.description}
                                </Text>
                            </Card>
                        )}

                    </Stack>
                </Box>

                {/* ── Main content ── */}
                <Box style={{ gridColumn: 'span 8' }}>
                    <Stack gap="xl">
                        {/* Title + platform tabs */}
                        <Box>
                            <Group gap="sm" mb={6}>
                                {game.genres && game.genres.length > 0 && (
                                    game.genres.map((genre) => (
                                        <Badge key={genre.id} variant="light" color="gray" size="sm">
                                            {genre.name}
                                        </Badge>
                                    ))
                                )}
                            </Group>

                            <Title order={1} fz={{ base: 28, md: 36 }} fw={800} mb="sm">
                                {game.name}
                            </Title>

                            {/* Platform selector */}
                            {game.platforms.length > 1 && (
                                <Group gap={4} mb="sm">
                                    <Box
                                        p={4}
                                        style={{
                                            display: 'inline-flex',
                                            borderRadius: 'var(--mantine-radius-md)',
                                            border: '1px solid var(--mantine-color-default-border)',
                                            background: isDark ? 'rgba(0,0,0,0.3)' : 'var(--mantine-color-gray-0)',
                                        }}
                                    >
                                        {game.platforms.map((pl) => {
                                            const Icon = platformIconMap[pl.name] || IconDeviceGamepad;
                                            const pColor = PLATFORM_COLORS[pl.name]?.mantine || 'gray';
                                            return (
                                                <Button
                                                    key={pl.id}
                                                    size="xs"
                                                    radius="sm"
                                                    variant={selectedPlatform === pl.name ? 'filled' : 'subtle'}
                                                    color={selectedPlatform === pl.name ? pColor : 'gray'}
                                                    leftSection={<Icon size={18} />}
                                                    onClick={() => setSelectedPlatform(pl.name)}
                                                    style={{ transition: 'all 0.2s' }}
                                                >
                                                    {pl.display_name}
                                                </Button>
                                            );
                                        })}
                                    </Box>
                                </Group>
                            )}

                            <Text fz="sm" c="dimmed" maw={600} lh={1.6}>
                                Compara precios entre distintas tiendas y encuentra la mejor oferta.
                            </Text>

                            {/* Action buttons */}
                            <Group gap="xs" mt="sm">
                                <ActionIcon variant="default" size="lg" radius="xl">
                                    <IconBookmark size={18} />
                                </ActionIcon>
                                <ActionIcon variant="default" size="lg" radius="xl">
                                    <IconShare size={18} />
                                </ActionIcon>
                            </Group>
                        </Box>

                        {/* ══════ Best price hero card ══════ */}
                        {bestProduct && (
                            <Box
                                p={{ base: 'lg', md: 'xl' }}
                                style={{
                                    borderRadius: 'var(--mantine-radius-xl)',
                                    background: 'linear-gradient(135deg, #1F2937, #111827)',
                                    color: '#fff',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Decorative circle */}
                                <Box
                                    pos="absolute"
                                    top={-60}
                                    right={-60}
                                    w={240}
                                    h={240}
                                    style={{
                                        borderRadius: '50%',
                                        background: 'var(--mantine-color-primaryRed-5)',
                                        filter: 'blur(80px)',
                                        opacity: 0.2,
                                        pointerEvents: 'none',
                                    }}
                                />

                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" style={{ position: 'relative', zIndex: 1 }}>
                                    <Box>
                                        <Badge
                                            color="primaryRed"
                                            variant="light"
                                            size="sm"
                                            leftSection={<IconTag size={12} />}
                                            mb="sm"
                                        >
                                            Mejor Precio {selectedPlatform?.toUpperCase()}
                                        </Badge>

                                        <Group gap="sm" align="baseline">
                                            <Text fz={42} fw={800} lh={1}>{formatCLP(bestPrice)}</Text>
                                        </Group>

                                        <Group gap="xs" mt="sm" c="rgba(255,255,255,0.7)" fz="sm">
                                            <Text>Vendido por <Text span fw={700} c="#fff">{bestProduct.seller.name}</Text></Text>
                                            <Text c="rgba(255,255,255,0.4)">•</Text>
                                            <Group gap={4} c="green.4" fz="xs">
                                                <IconCheck size={14} /> Stock Disponible
                                            </Group>
                                        </Group>

                                        <Text fz="xs" c="rgba(255,255,255,0.5)" mt={4} fs="italic">
                                            &quot;{bestProduct.title}&quot;
                                        </Text>
                                    </Box>

                                    <Stack align="stretch" justify="center" gap="sm">
                                        <Button
                                            component="a"
                                            href={bestProduct.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            color="primaryRed"
                                            size="lg"
                                            radius="lg"
                                            rightSection={<IconExternalLink size={18} />}
                                            style={{ boxShadow: '0 8px 25px rgba(230,57,70,0.3)' }}
                                        >
                                            Ir a la Tienda
                                        </Button>
                                        <Text fz="xs" c="rgba(255,255,255,0.5)" ta="center">
                                            Actualizado recientemente
                                        </Text>
                                    </Stack>
                                </SimpleGrid>
                            </Box>
                        )}

                        {/* ══════ Price comparison table ══════ */}
                        <Card withBorder radius="xl" p={0} style={{ overflow: 'hidden' }}>
                            <Box
                                p="lg"
                                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                            >
                                <Group justify="space-between" wrap="wrap" gap="md">
                                    <Title order={3} fz="lg" fw={700}>
                                        <Group gap={8}>
                                            <IconTableColumn size={20} color="var(--mantine-color-primaryRed-5)" />
                                            Comparativa de Precios
                                        </Group>
                                    </Title>

                                    <Select
                                        data={[
                                            { value: '', label: 'Cualquier Estado' },
                                            { value: 'new', label: 'Nuevo' },
                                            { value: 'used', label: 'Usado' },
                                            { value: 'digital', label: 'Digital' },
                                        ]}
                                        value={conditionFilter ?? ''}
                                        onChange={(v) => setConditionFilter(v || null)}
                                        size="xs"
                                        radius="md"
                                        w={160}
                                    />
                                </Group>
                            </Box>

                            <Table.ScrollContainer minWidth={500}>
                                <Table verticalSpacing="md" horizontalSpacing="lg">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Tienda & Producto</Table.Th>
                                            <Table.Th>Precio</Table.Th>
                                            <Table.Th>Estado</Table.Th>
                                            <Table.Th ta="right">Acción</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {sorted.length === 0 ? (
                                            <Table.Tr>
                                                <Table.Td colSpan={4}>
                                                    <Text c="dimmed" ta="center" py="lg">
                                                        No hay productos disponibles con estos filtros
                                                    </Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ) : (
                                            sorted.map((p, idx) => (
                                                <Table.Tr
                                                    key={p.id}
                                                    style={{ transition: 'background 0.15s', cursor: 'pointer' }}
                                                    onMouseEnter={() => p.image ? setHoveredProductImage(p.image) : undefined}
                                                    onMouseLeave={() => setHoveredProductImage(null)}
                                                >
                                                    <Table.Td>
                                                        <Group gap="sm" wrap="nowrap">
                                                            <Box
                                                                w={40}
                                                                h={40}
                                                                style={{
                                                                    borderRadius: 'var(--mantine-radius-sm)',
                                                                    background: isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-1)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontWeight: 700,
                                                                    fontSize: 12,
                                                                    color: sellerColors[idx % sellerColors.length],
                                                                    flexShrink: 0,
                                                                    overflow: 'hidden',
                                                                }}
                                                            >
                                                                {p.seller.logo ? (
                                                                    <img
                                                                        src={p.seller.logo}
                                                                        alt={p.seller.name}
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '100%',
                                                                            objectFit: 'contain',
                                                                            padding: 4,
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    p.seller.name.slice(0, 2).toUpperCase()
                                                                )}
                                                            </Box>
                                                            <Box>
                                                                <Text fw={700} fz="sm">{p.seller.name}</Text>
                                                                <Text fz="xs" c="var(--mantine-color-primaryRed-5)" lineClamp={1}>
                                                                    {p.title}
                                                                </Text>
                                                            </Box>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text
                                                            fw={700}
                                                            fz="md"
                                                            c={idx === 0 ? 'var(--mantine-color-primaryRed-5)' : undefined}
                                                        >
                                                            {p.current_price ? formatCLP(p.current_price) : '—'}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            color={conditionBadgeColor[p.condition] ?? 'gray'}
                                                            variant="light"
                                                            size="sm"
                                                        >
                                                            {conditionLabel[p.condition] ?? p.condition}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td ta="right">
                                                        <Button
                                                            component="a"
                                                            href={p.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            size="xs"
                                                            radius="md"
                                                            variant={idx === 0 ? 'filled' : 'default'}
                                                            color={idx === 0 ? 'dark' : undefined}
                                                        >
                                                            Ver en Tienda
                                                        </Button>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        </Card>

                        {/* ══════ Price chart ══════ */}
                        {chartData.length > 1 && (
                            <Card withBorder radius="xl" p="lg">
                                <Group justify="space-between" mb="lg">
                                    <Title order={3} fz="lg" fw={700}>
                                        <Group gap={8}>
                                            <IconChartLine size={20} color="var(--mantine-color-primaryRed-5)" />
                                            Comparativa de Precios por Tienda
                                        </Group>
                                    </Title>
                                    {bestProduct && (
                                        <Badge variant="light" color="gray" radius="xl" size="sm">
                                            Mínimo: {formatCLP(bestPrice)}
                                        </Badge>
                                    )}
                                </Group>

                                <Box h={200}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--mantine-color-primaryRed-5)" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="var(--mantine-color-primaryRed-5)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip
                                                formatter={(v: number) => [formatCLP(v), 'Precio']}
                                                contentStyle={{
                                                    background: isDark ? '#1F2937' : '#fff',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 8,
                                                    color: isDark ? '#fff' : '#1F2937',
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="price"
                                                stroke="var(--mantine-color-primaryRed-5)"
                                                strokeWidth={3}
                                                fill="url(#colorPrice)"
                                                dot={{ r: 4, fill: '#fff', stroke: 'var(--mantine-color-primaryRed-5)', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Card>
                        )}
                    </Stack>
                </Box>
            </SimpleGrid>
        </Container>
    );
}
