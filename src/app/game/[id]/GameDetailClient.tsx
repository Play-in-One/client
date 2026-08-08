'use client';

import { Fragment, type ComponentType, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { handleImageError } from '@/lib/imageFallback';
import { useSearchParams } from 'next/navigation';
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
    Stack,
    ActionIcon,
    Grid,
    SimpleGrid,
    Select,
    Tooltip as MantineTooltip,
} from '@mantine/core';
import {
    IconBookmark,
    IconBookmarkFilled,
    IconShare,
    IconLink,
    IconExternalLink,
    IconTag,
    IconTableColumn,
    IconChevronRight,
    IconHome,
    IconCheck,
    IconDeviceGamepad,
    IconDeviceGamepad2,
    IconDeviceNintendo,
    IconDeviceDesktop,
    IconPencil,
} from '@tabler/icons-react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';

import { trackEvent } from '@/lib/api';
import type { Game, Product } from '@/lib/types';
import { formatCLP, PLATFORM_COLORS } from '@/lib/utils';
import { surfaces, decorative } from '@/lib/colors';
import PlatformBadge from '@/components/PlatformBadge';
// recharts es pesado y el gráfico va bajo el pliegue: se carga por separado
// (fuera del bundle inicial del detalle) y solo en el cliente.
const ProductPriceChart = dynamic(() => import('@/components/ProductPriceChart'), { ssr: false });
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { AdminGameControls, AdminProductEditor } from './AdminControls';

export default function GameDetailClient({ initialGame }: { initialGame: Game }) {
    const searchParams = useSearchParams();
    const { condition, isSaved, toggleSaved } = useApp();
    const { isAdmin } = useAdmin();
    // Server-rendered: the game is always present on first paint (page.tsx guards 404).
    const game = initialGame;
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(() => {
        const requestedSlug = searchParams.get('platform');
        const requested = requestedSlug ? game.platforms.find((p) => p.slug === requestedSlug) : null;
        return requested?.name ?? game.platforms[0]?.name ?? null;
    });
    const [conditionFilter, setConditionFilter] = useState<string | null>(
        condition !== 'all' ? condition : null,
    );
    const [hoveredProductImage, setHoveredProductImage] = useState<string | null>(null);
    const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
    // Edición admin: toggles independientes para el panel del juego y por producto.
    const [editingGame, setEditingGame] = useState(false);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    useEffect(() => {
        setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

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

    const handleToggleSave = () => {
        const willSave = !isSaved(game.id);
        toggleSaved({
            id: game.id,
            name: game.name,
            image: game.image,
            min_price: game.min_price,
            platforms: game.platforms,
            savedAt: new Date().toISOString(),
        });
        // Track only the save action (not un-saving) — popularity of saved games.
        if (willSave) trackEvent({ event_type: 'game_save', game: game.id });
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/game/${game.id}`;
        const shareData = { title: game.name, text: `Mira el precio de ${game.name} en PlayInOne`, url: shareUrl };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // user cancelled the share sheet
            }
        } else if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // clipboard write blocked
            }
        }
    };

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

    const platformIconMap: Record<string, ComponentType<{ size?: number; className?: string }>> = {
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

    const breadcrumbPlatform = game.platforms.find((p) => p.name === selectedPlatform) ?? game.platforms[0];


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
                {breadcrumbPlatform && (
                    <Anchor href={`/search?platform=${breadcrumbPlatform.slug}`} c="dimmed" underline="never">
                        {breadcrumbPlatform.display_name}
                    </Anchor>
                )}
                <Text fw={500}>{game.name}</Text>
            </Breadcrumbs>

            {/* Main layout: sidebar + content */}
            <Grid gutter="xl">
                {/* ── Sidebar: Cover + info ── */}
                <Grid.Col span={{ base: 12, lg: 4 }}>
                    {/* Cover art (sticky) */}
                    <Box
                        style={{
                            position: 'sticky',
                            top: 73,
                            zIndex: 5,
                            paddingTop: 15,
                            marginTop: -15,
                            background: 'var(--mantine-color-body)',
                        }}
                    >
                        <Box
                            pos="relative"
                            maw={{ base: '85%', lg: '100%' }}
                            mx={{ base: 'auto', lg: 0 }}
                            style={{
                                borderRadius: 'var(--mantine-radius-lg)',
                                overflow: 'hidden',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                                border: '1px solid var(--mantine-color-default-border)',
                                aspectRatio: '3/4',
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
                                onError={handleImageError('/placeholder-game.png')}
                            />

                            {/* Product image (hover overlay) */}
                            {hoveredProductImage && (
                                <img
                                    src={hoveredProductImage}
                                    alt={`Oferta de ${game.name}`}
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
                    </Box>

                    <Stack gap="md" mt="md">
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
                                <Text fw={700} mb="xs" ta={{ base: 'center', lg: 'left' }}>Acerca del juego</Text>
                                <Text fz="sm" c="dimmed" lh={1.6} ta={{ base: 'center', lg: 'left' }}>
                                    {game.description}
                                </Text>
                            </Card>
                        )}

                    </Stack>
                </Grid.Col>

                {/* ── Main content ── */}
                <Grid.Col span={{ base: 12, lg: 8 }}>
                    <Stack gap="xl">
                        {/* Title + platform tabs */}
                        <Box
                            style={{
                                position: 'sticky',
                                top: 73,
                                zIndex: 5,
                                background: 'var(--mantine-color-body)',
                                paddingTop: 15,
                                marginTop: -15,
                                paddingBottom: 8,
                            }}
                        >
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
                                            background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTintStrong})`,
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
                                <ActionIcon
                                    variant={isSaved(game.id) ? 'filled' : 'default'}
                                    color={isSaved(game.id) ? 'primaryRed' : undefined}
                                    size="lg"
                                    radius="xl"
                                    onClick={handleToggleSave}
                                    aria-label={isSaved(game.id) ? 'Quitar de guardados' : 'Guardar juego'}
                                >
                                    {isSaved(game.id) ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
                                </ActionIcon>
                                <MantineTooltip
                                    label={copied ? '¡Enlace copiado!' : canNativeShare ? 'Compartir' : 'Copiar enlace'}
                                    withArrow
                                >
                                    <ActionIcon
                                        variant="default"
                                        size="lg"
                                        radius="xl"
                                        onClick={handleShare}
                                        aria-label={copied ? 'Enlace copiado' : canNativeShare ? 'Compartir' : 'Copiar enlace'}
                                    >
                                        {copied ? <IconCheck size={18} /> : canNativeShare ? <IconShare size={18} /> : <IconLink size={18} />}
                                    </ActionIcon>
                                </MantineTooltip>
                                {isAdmin && (
                                    <Button
                                        size="sm"
                                        radius="xl"
                                        variant={editingGame ? 'filled' : 'default'}
                                        color={editingGame ? 'yellow' : undefined}
                                        leftSection={<IconPencil size={16} />}
                                        onClick={() => setEditingGame((v) => !v)}
                                    >
                                        {editingGame ? 'Cerrar edición' : 'Editar juego'}
                                    </Button>
                                )}
                            </Group>
                        </Box>

                        {/* ══════ Panel admin: nombre, imagen, fusión (tras "Editar juego") ══════ */}
                        {isAdmin && editingGame && <AdminGameControls game={game} />}

                        {/* ══════ Best price hero card ══════ */}
                        {bestProduct && (
                            <Box
                                p={{ base: 'lg', md: 'xl' }}
                                style={{
                                    borderRadius: 'var(--mantine-radius-xl)',
                                    background: `linear-gradient(135deg, light-dark(${decorative.bestPriceCardGradient.light.from}, ${decorative.bestPriceCardGradient.dark.from}), light-dark(${decorative.bestPriceCardGradient.light.to}, ${decorative.bestPriceCardGradient.dark.to}))`,
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
                                            <Text>Vendido por <Anchor
                                                component="a"
                                                href={bestProduct.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => trackEvent({ event_type: 'offer_click', product: bestProduct.id, game: game.id, platform: bestProduct.platform?.id })}
                                                fw={700}
                                                c="#fff"
                                                underline="hover"
                                            >{bestProduct.seller.name}</Anchor></Text>
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
                                            onClick={() => trackEvent({ event_type: 'offer_click', product: bestProduct.id, game: game.id, platform: bestProduct.platform?.id })}
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
                                            <Table.Th>Tendencia</Table.Th>
                                            <Table.Th miw={100} style={{ whiteSpace: 'nowrap' }}>Estado</Table.Th>
                                            <Table.Th ta="right"></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {sorted.length === 0 ? (
                                            <Table.Tr>
                                                <Table.Td colSpan={5}>
                                                    <Text c="dimmed" ta="center" py="lg">
                                                        No hay productos disponibles con estos filtros
                                                    </Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ) : (
                                            sorted.map((p, idx) => (
                                            <Fragment key={p.id}>
                                                <Table.Tr
                                                    style={{ transition: 'background 0.15s' }}
                                                    onMouseEnter={() => p.image ? setHoveredProductImage(p.image) : undefined}
                                                    onMouseLeave={() => setHoveredProductImage(null)}
                                                >
                                                    <Table.Td>
                                                        <Group gap="sm" wrap="nowrap">
                                                            <Anchor href={`/store/${p.seller.id}`} underline="never" c="inherit">
                                                                <Box
                                                                    w={40}
                                                                    h={40}
                                                                    style={{
                                                                        borderRadius: 'var(--mantine-radius-sm)',
                                                                        background: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))',
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
                                                                    {(p.seller.favicon || p.seller.logo) ? (
                                                                        <img
                                                                            src={p.seller.favicon || p.seller.logo || ''}
                                                                            alt={p.seller.name}
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit: 'contain',
                                                                                padding: 4,
                                                                            }}
                                                                            onError={(e) => {
                                                                                if (p.seller.logo && e.currentTarget.src !== p.seller.logo) {
                                                                                    e.currentTarget.src = p.seller.logo;
                                                                                } else {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        p.seller.name.slice(0, 2).toUpperCase()
                                                                    )}
                                                                </Box>
                                                            </Anchor>
                                                            <Anchor
                                                                component="a"
                                                                href={p.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={() => trackEvent({ event_type: 'offer_click', product: p.id, game: game.id, platform: p.platform?.id })}
                                                                underline="never"
                                                                c="inherit"
                                                            >
                                                                <Box>
                                                                    <Text fw={700} fz="sm">{p.seller.name}</Text>
                                                                    <Text fz="xs" c="var(--mantine-color-primaryRed-5)" lineClamp={1}>
                                                                        {p.title}
                                                                    </Text>
                                                                </Box>
                                                            </Anchor>
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
                                                        <ProductPriceChart
                                                            prices={p.prices ?? []}
                                                            size="sm"
                                                            onClick={
                                                                (p.prices?.length ?? 0) >= 2
                                                                    ? () => setExpandedProductId((id) => (id === p.id ? null : p.id))
                                                                    : undefined
                                                            }
                                                        />
                                                    </Table.Td>
                                                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                                                        <Badge
                                                            color={conditionBadgeColor[p.condition] ?? 'gray'}
                                                            variant="light"
                                                            size="sm"
                                                            styles={{ label: { overflow: 'visible' } }}
                                                        >
                                                            {conditionLabel[p.condition] ?? p.condition}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td ta="right">
                                                        <Group gap={6} justify="flex-end" wrap="nowrap">
                                                            <MantineTooltip label="Ver en Tienda" withArrow>
                                                                <ActionIcon
                                                                    component="a"
                                                                    href={p.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={() => trackEvent({ event_type: 'offer_click', product: p.id, game: game.id, platform: p.platform?.id })}
                                                                    size="lg"
                                                                    radius="md"
                                                                    variant={idx === 0 ? 'filled' : 'default'}
                                                                    color={idx === 0 ? 'dark' : undefined}
                                                                    aria-label="Ver en Tienda"
                                                                >
                                                                    <IconExternalLink size={16} />
                                                                </ActionIcon>
                                                            </MantineTooltip>
                                                            {isAdmin && (
                                                                <MantineTooltip label="Editar producto" withArrow>
                                                                    <ActionIcon
                                                                        variant={editingProductId === p.id ? 'filled' : 'subtle'}
                                                                        color="yellow"
                                                                        size="lg"
                                                                        radius="md"
                                                                        aria-label="Editar producto"
                                                                        onClick={() => setEditingProductId((id) => (id === p.id ? null : p.id))}
                                                                    >
                                                                        <IconPencil size={16} />
                                                                    </ActionIcon>
                                                                </MantineTooltip>
                                                            )}
                                                        </Group>
                                                    </Table.Td>
                                                </Table.Tr>
                                                {expandedProductId === p.id && (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={5} p="md">
                                                            <ProductPriceChart prices={p.prices ?? []} size="lg" />
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                                {isAdmin && editingProductId === p.id && (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={5} p="md">
                                                            <AdminProductEditor product={p} />
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                            </Fragment>
                                            ))
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        </Card>
                    </Stack>
                </Grid.Col>
            </Grid>
        </Container>
    );
}
