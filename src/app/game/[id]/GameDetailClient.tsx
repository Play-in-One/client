'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
    IconPencil,
} from '@tabler/icons-react';

import { trackEvent } from '@/lib/api';
import { useConsent } from '@/context/ConsentContext';
import type { Game, Product } from '@/lib/types';
import type { Prefs } from '@/lib/prefs';
import { formatCLP, PLATFORM_COLORS } from '@/lib/utils';
import { PLATFORM_ICONS, PLATFORM_SHORT_LABELS } from '@/lib/platformIcons';
import { surfaces, decorative } from '@/lib/colors';
import { bestPriceSentence } from '@/lib/seo';
import CollapsibleText from '@/components/CollapsibleText';
import PlatformBadge from '@/components/PlatformBadge';
import ShippingInfo from '@/components/ShippingInfo';
import SellerScopeBadge from '@/components/SellerScopeBadge';
// recharts es pesado y el gráfico va bajo el pliegue: se carga por separado
// (fuera del bundle inicial del detalle) y solo en el cliente.
const MinPriceChartCard = dynamic(() => import('@/components/MinPriceChartCard'), { ssr: false });
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { AdminGameControls, AdminProductEditor } from './AdminControls';

export default function GameDetailClient({
    initialGame,
    initialPrefs,
}: {
    initialGame: Game;
    initialPrefs: Prefs;
}) {
    const searchParams = useSearchParams();
    const { condition, includeInternational, ready, isSaved, toggleSaved } = useApp();
    const { isAdmin } = useAdmin();
    // Server-rendered: the game is always present on first paint (page.tsx guards 404).
    const game = initialGame;
    // El backend garantiza que una consola solo está en el juego mientras tenga
    // al menos un producto visible de ella, así que no hay tabs vacíos que filtrar.
    const platformOptions = game.platforms;
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(() => {
        const requestedSlug = searchParams.get('platform');
        const requested = requestedSlug ? platformOptions.find((p) => p.slug === requestedSlug) : null;
        return requested?.name ?? platformOptions[0]?.name ?? null;
    });
    /* Hasta que el contexto lee lo persistido manda lo que el SERVIDOR ya
       resolvió desde la cookie: el primer render coincide con el HTML y no hay
       nada que corregir después. Sin esto, las ofertas importadas asomaban un
       instante en cada carga. */
    const effectivePrefs: Prefs = ready
        ? { condition, international: includeInternational }
        : initialPrefs;

    const [conditionFilter, setConditionFilter] = useState<string | null>(
        initialPrefs.condition !== 'all' ? initialPrefs.condition : null,
    );
    const [conditionManuallySet, setConditionManuallySet] = useState(false);
    // El switch del header manda mientras el usuario no elija manualmente
    // una condición en el Select local de la tabla de precios.
    useEffect(() => {
        if (!conditionManuallySet && ready) {
            setConditionFilter(condition !== 'all' ? condition : null);
        }
    }, [condition, conditionManuallySet, ready]);
    const [hoveredProductImage, setHoveredProductImage] = useState<string | null>(null);
    // Edición admin: toggles independientes para el panel del juego y por producto.
    const [editingGame, setEditingGame] = useState(false);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    useEffect(() => {
        setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    /* ── Popularity tracking ──
       El page_view del layout ya registra la ruta, pero normalizada a
       `/game/[id]`: no dice QUÉ juego se vio. Este evento es el escalón
       intermedio del embudo (clic en la tarjeta → ver el detalle → salir a la
       tienda) y sin él no se puede saber cuántas visitas a una ficha acaban
       en un clic a un vendedor. */
    // Esperar a `ready` no es opcional: React corre los efectos de los hijos
    // antes que los del padre, así que en una carga en frío este efecto se
    // adelantaba a ConsentContext. El evento salía sin `visitor_id` — el
    // backend lo agrupaba bajo el hash anónimo y la misma persona contaba dos
    // veces — y salía incluso con el opt-out total activo.
    const { ready: consentReady } = useConsent();
    const viewedGame = useRef<number | null>(null);
    useEffect(() => {
        if (!consentReady || viewedGame.current === game.id) return;
        viewedGame.current = game.id;
        trackEvent({ event_type: 'game_view', game: game.id });
    }, [game.id, consentReady]);

    // Filter products
    // El detalle recibe TODAS las ofertas del juego y las acota aquí: los
    // filtros globales no viajan al servidor porque la página es SSR y su
    // valor vive en localStorage.
    const products = (game.products ?? []).filter((p) => {
        if (selectedPlatform && p.platform.name !== selectedPlatform) return false;
        if (conditionFilter && p.condition !== conditionFilter) return false;
        if (!effectivePrefs.international && p.seller.is_international) return false;
        return true;
    });

    // Sort by price ascending
    const sorted = [...products].sort((a, b) => {
        const pa = parseFloat(a.current_price ?? '999999');
        const pb = parseFloat(b.current_price ?? '999999');
        return pa - pb;
    });

    const bestProduct = sorted[0] ?? null;
    // `current_price` ya viene con el envío de la tienda sumado: es el precio con
    // el que se compara y el que se ordena arriba.
    const bestPrice = bestProduct ? parseFloat(bestProduct.current_price ?? '0') : 0;
    const bestShipping = bestProduct ? parseFloat(bestProduct.shipping_cost ?? '0') : 0;

    // Resumen citable para motores generativos. Se arma con lo que la pantalla
    // está mostrando de verdad —consola, condición y el toggle de tiendas
    // internacionales—, no con el mínimo global del juego: si dijera otra cifra
    // que la tarjeta "Mejor Precio" de abajo, el texto estaría mintiendo.
    const geoSummary = bestProduct
        ? bestPriceSentence(game, {
            platform: platformOptions.find((p) => p.name === selectedPlatform) ?? null,
            price: bestProduct.current_price,
            sellerName: bestProduct.seller.name,
            shipping: bestProduct.shipping_cost,
            offerCount: sorted.length,
            sellerCount: new Set(sorted.map((p) => p.seller.id)).size,
        })
        : null;

    // Serie histórica del mínimo de la consola/condición activas. Viene toda
    // embebida en el detalle, así que cambiar de tab no dispara un request.
    // La clave "" del backend es la serie agregada (todas las condiciones).
    //
    // Con las internacionales apagadas manda la serie nacional, para que el
    // gráfico no contradiga al precio de arriba. El backend la omite cuando
    // sería idéntica a la agregada (juegos sin ofertas importadas), así que un
    // objeto vacío significa "usa la agregada", no "no hay datos".
    const historySource =
        !effectivePrefs.international && Object.keys(game.min_price_history_national ?? {}).length > 0
            ? game.min_price_history_national
            : game.min_price_history;
    const minPriceSeries =
        historySource?.[selectedPlatform ?? '']?.[conditionFilter ?? ''] ?? [];

    // Portada: la fija (puesta a mano) manda; si no, sale del producto más
    // barato de los que pasan los filtros ACTIVOS de esta pantalla, así que
    // cambia con el selector de consola y el de nuevo/usado. Si el más barato
    // no tiene foto se busca el siguiente que sí la tenga.
    // game.image cubre el render inicial/SSR: es la portada que ya derivó el
    // backend sin filtros, útil mientras ningún producto pase el filtro activo.
    const coverImage =
        (game.image_is_custom
            ? game.image
            : sorted.find((p) => p.image)?.image ?? game.image) || '/placeholder-game.png';

    const handleToggleSave = () => {
        const willSave = !isSaved(game.id);
        toggleSaved(game.id);
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

    const breadcrumbPlatform = game.platforms.find((p) => p.name === selectedPlatform) ?? game.platforms[0];


    return (
        <Container size="lg" py="xl">
            {/* Breadcrumbs */}
            <Breadcrumbs
                separator={<IconChevronRight size={14} color="var(--mantine-color-dimmed)" />}
                mb="xl"
                fz="sm"
            >
                <Anchor component={Link} href="/" c="dimmed" underline="never">
                    <Group gap={4}><IconHome size={14} /> Inicio</Group>
                </Anchor>
                {breadcrumbPlatform && (
                    <Anchor component={Link} href={`/search?platform=${breadcrumbPlatform.slug}`} c="dimmed" underline="never">
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
                                src={coverImage}
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

                            {/* Selector de consola: game.platforms ya viene podado por el backend */}
                            {platformOptions.length > 1 && (
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
                                        {platformOptions.map((pl) => {
                                            const Icon = PLATFORM_ICONS[pl.name] || IconDeviceGamepad;
                                            const pColor = PLATFORM_COLORS[pl.name]?.mantine || 'gray';
                                            return (
                                                <Button
                                                    key={pl.id}
                                                    size="xs"
                                                    radius="sm"
                                                    variant={selectedPlatform === pl.name ? 'filled' : 'subtle'}
                                                    color={selectedPlatform === pl.name ? pColor : 'gray'}
                                                    leftSection={<Icon size={pl.name === 'switch' || pl.name === 'switch2' ? 15 : pl.name === 'xbox360' || pl.name === 'xboxone' || pl.name === 'xboxseries' ? 16 : 18} />}
                                                    onClick={() => setSelectedPlatform(pl.name)}
                                                    style={{ transition: 'all 0.2s' }}
                                                >
                                                    {PLATFORM_SHORT_LABELS[pl.name] || pl.display_name}
                                                </Button>
                                            );
                                        })}
                                    </Box>
                                </Group>
                            )}

                            {/* La frase citable (GEO): responde en una línea la
                                pregunta con la que se llega ("¿cuánto cuesta X
                                y dónde?"). Sale del mismo helper que la meta
                                description y la FAQ, y se recalcula con los
                                filtros activos para no contradecir a la tarjeta
                                de al lado.

                                Va PLEGADA para no cargar la cabecera de texto.
                                Plegar no cuesta nada en SEO ni en GEO —el texto
                                sigue entero en el HTML y un `<details>` cerrado
                                se indexa y se lee igual—, a diferencia de
                                esconderlo con display:none, que sería cloaking. */}
                            {geoSummary ? (
                                <CollapsibleText label="Ver resumen de precios">
                                    {geoSummary}
                                </CollapsibleText>
                            ) : (
                                <Text fz="sm" c="dimmed" maw={600} lh={1.6}>
                                    Compara precios entre distintas tiendas y encuentra la mejor oferta.
                                </Text>
                            )}

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

                                        <Group gap="sm" align="baseline" mb="sm">
                                            <Text fz={42} fw={800} lh={1}>{formatCLP(bestPrice)}</Text>
                                        </Group>
                                        {bestShipping > 0 ? (
                                            <Group gap={4} c="green.4" fz="xs" align="center">
                                                <IconCheck size={14} /> Incluye envío promedio
                                                <ShippingInfo
                                                    basePrice={bestProduct.base_price}
                                                    shippingCost={bestProduct.shipping_cost}
                                                    color="green"
                                                />
                                            </Group>
                                        ) : (
                                            <Group gap={4} c="green.4" fz="xs">
                                                <IconCheck size={14} /> No incluye gastos de envío
                                            </Group>
                                        )}

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

                        {/* ══════ Historial del precio mínimo de la consola ══════ */}
                        {selectedPlatform && (
                            <MinPriceChartCard
                                series={minPriceSeries}
                                platformLabel={
                                    PLATFORM_SHORT_LABELS[selectedPlatform] ??
                                    platformOptions.find((pl) => pl.name === selectedPlatform)?.display_name ??
                                    selectedPlatform
                                }
                                conditionLabel={conditionFilter ? conditionLabel[conditionFilter] : null}
                            />
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
                                        onChange={(v) => {
                                            setConditionManuallySet(true);
                                            setConditionFilter(v || null);
                                        }}
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
                                            <Table.Th miw={100} style={{ whiteSpace: 'nowrap' }}>Estado</Table.Th>
                                            <Table.Th ta="right"></Table.Th>
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
                                            <Fragment key={p.id}>
                                                <Table.Tr
                                                    style={{ transition: 'background 0.15s' }}
                                                    onMouseEnter={() => p.image ? setHoveredProductImage(p.image) : undefined}
                                                    onMouseLeave={() => setHoveredProductImage(null)}
                                                >
                                                    <Table.Td>
                                                        <Group gap="sm" wrap="nowrap">
                                                            <Anchor
                                                                component={Link}
                                                                href={`/store/${p.seller.id}`}
                                                                underline="never"
                                                                c="inherit"
                                                                // El resto de anchors de esta fila sí medían; este
                                                                // era el único sin instrumentar.
                                                                onClick={() => trackEvent({ event_type: 'store_view', seller: p.seller.id })}
                                                            >
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
                                                                    <Group gap={6} wrap="nowrap" align="center">
                                                                        <Text fw={700} fz="sm">{p.seller.name}</Text>
                                                                        <SellerScopeBadge seller={p.seller} />
                                                                    </Group>
                                                                    <Text fz="xs" c="var(--mantine-color-primaryRed-5)" lineClamp={1}>
                                                                        {p.title}
                                                                    </Text>
                                                                </Box>
                                                            </Anchor>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Group gap={2} wrap="nowrap" align="center">
                                                            <Text
                                                                fw={700}
                                                                fz="md"
                                                                c={idx === 0 ? 'var(--mantine-color-primaryRed-5)' : undefined}
                                                            >
                                                                {p.current_price ? formatCLP(p.current_price) : '—'}
                                                            </Text>
                                                            <ShippingInfo
                                                                basePrice={p.base_price}
                                                                shippingCost={p.shipping_cost}
                                                            />
                                                        </Group>
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
                                                {isAdmin && editingProductId === p.id && (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={4} p="md">
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
