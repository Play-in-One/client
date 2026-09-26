'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { handleImageError } from '@/lib/imageFallback';
import { gamePath } from '@/lib/seo';
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
    HoverCard,
    Center,
    Loader,
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
    IconPencil,
    IconCloudDownload,
    IconKey,
    IconRecycle,
    IconSparkles,
} from '@tabler/icons-react';

import { trackEvent, getGameClickStats } from '@/lib/api';
import { useConsent } from '@/context/ConsentContext';
import type { Game, Product, GameClickStats } from '@/lib/types';
import { platformLongName, activeCoupon } from '@/lib/types';
import { allowedConditionsFor, type ConditionFilter, type DigitalFilter, type FormatFilter, type Prefs } from '@/lib/prefs';
import { formatCLP, PLATFORM_COLORS } from '@/lib/utils';
import { PLATFORM_ICONS, PLATFORM_SHORT_LABELS, FALLBACK_PLATFORM_ICON } from '@/lib/platformIcons';
import { surfaces, decorative } from '@/lib/colors';
import { bestPriceSentence } from '@/lib/seo';
import CollapsibleText from '@/components/CollapsibleText';
import PriceInfo from '@/components/PriceInfo';
import CouponModal, { type PendingOffer } from '@/components/CouponModal';
import SellerScopeBadge from '@/components/SellerScopeBadge';
import ConditionIcon from '@/components/ConditionIcon';
import GameClickBadge from '@/components/GameClickBadge';
import ProductClickBadge from '@/components/ProductClickBadge';
import {
    conditionBadgeColorFor,
    conditionBucket,
    conditionLabelFor,
} from '@/lib/conditions';
// recharts es pesado y el gráfico va bajo el pliegue: se carga por separado
// (fuera del bundle inicial del detalle) y solo en el cliente.
const MinPriceChartCard = dynamic(() => import('@/components/MinPriceChartCard'), { ssr: false });
const GameRatingsChart = dynamic(() => import('@/components/GameRatingsChart'), {
    ssr: false,
    loading: () => (
        <Center h="100%" mih={96}>
            <Loader size="sm" color="primaryRed" />
        </Center>
    ),
});
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { AdminGameControls, AdminProductEditor } from './AdminControls';

const PRICE_TABLE_CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo', icon: IconSparkles },
    { value: 'used', label: 'Usado', icon: IconRecycle },
    { value: 'store', label: 'Store', icon: IconCloudDownload },
    { value: 'key', label: 'Código', icon: IconKey },
] as const;

const PRICE_TABLE_CONDITION_ICONS = Object.fromEntries(
    PRICE_TABLE_CONDITION_OPTIONS.map((option) => [option.value, option.icon]),
) as Record<string, (typeof PRICE_TABLE_CONDITION_OPTIONS)[number]['icon']>;

/* El valor que le toca al Select local según el par del navbar. `null` = sin
 * acotar, que es lo que corresponde a "físico + todos": ese caso no es
 * representable en un Select de valor único, y las ofertas ya las recorta
 * `navbarAllowed`. */
function selectValueFor(format: FormatFilter, condition: ConditionFilter, digital: DigitalFilter): string | null {
    if (format === 'all') {
        if (condition === 'all' && digital === 'all') return null;
        if (condition === 'all') return `physical_${digital}`;
        if (digital === 'all') return `${condition}_digital`;
        return `${condition}_${digital}`;
    }
    if (format !== 'physical' && digital !== 'all') return digital;
    if (format === 'digital') return null;
    if (condition !== 'all') return condition;
    return null;
}

/** Formato fijo para que servidor y cliente muestren la misma fecha. */
function formatPriceUpdateDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Santiago',
    }).format(date);
}

function ProductImagePreview({ src, title }: { src: string; title: string }) {
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    return (
        <Box
            h={260}
            pos="relative"
            style={{
                overflow: 'hidden',
                borderRadius: 'var(--mantine-radius-sm)',
                background: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
            }}
        >
            {loading && !failed && (
                <Center pos="absolute" inset={0}>
                    <Loader size="sm" color="primaryRed" />
                </Center>
            )}
            {failed ? (
                <Center h="100%">
                    <Text fz="xs" c="dimmed">Imagen no disponible</Text>
                </Center>
            ) : (
                <img
                    src={src}
                    alt={`Vista previa de ${title}`}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setFailed(true);
                    }}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: loading ? 0 : 1,
                        transform: loading ? 'scale(0.98)' : 'scale(1)',
                        transition: 'opacity 180ms ease, transform 180ms ease',
                    }}
                />
            )}
        </Box>
    );
}

export default function GameDetailClient({
    initialGame,
    initialPrefs,
}: {
    initialGame: Game;
    initialPrefs: Prefs;
}) {
    const searchParams = useSearchParams();
    const { condition, format, digital, includeInternational, ready, isSaved, toggleSaved } = useApp();
    const { isAdmin } = useAdmin();
    // La sesión de staff vive en localStorage, inexistente durante SSR. Aplazar
    // estos controles hasta después del montaje garantiza que el HTML inicial
    // sea idéntico en servidor y cliente.
    const [isClientMounted, setIsClientMounted] = useState(false);
    useEffect(() => { setIsClientMounted(true); }, []);
    const showAdminControls = isClientMounted && isAdmin;
    // Server-rendered: the game is always present on first paint (page.tsx guards 404).
    const game = initialGame;
    const priceUpdatedDate = formatPriceUpdateDate(game.price_updated_at);

    /* Un solo fetch para el badge del juego Y el de cada oferta: el backend ya
       devuelve el desglose por producto en la misma respuesta, así que pedirlo
       por fila sería N llamadas por una que ya trae todo. Solo para staff. */
    const [clickStats, setClickStats] = useState<GameClickStats | null>(null);
    useEffect(() => {
        if (!isAdmin) { setClickStats(null); return; }
        let cancelled = false;
        getGameClickStats(game.id)
            .then((data) => { if (!cancelled) setClickStats(data); })
            .catch(() => { /* silencioso: extra del panel, no debe romper la ficha */ });
        return () => { cancelled = true; };
    }, [isAdmin, game.id]);
    // El backend garantiza que una consola solo está en el juego mientras tenga
    // al menos un producto visible de ella, así que no hay tabs vacíos que filtrar.
    const platformOptions = game.platforms;
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(() => {
        const requestedSlug = searchParams.get('platform');
        const requested = requestedSlug ? platformOptions.find((p) => p.slug === requestedSlug) : null;
        return requested?.slug ?? platformOptions[0]?.slug ?? null;
    });
    /* Hasta que el contexto lee lo persistido manda lo que el SERVIDOR ya
       resolvió desde la cookie: el primer render coincide con el HTML y no hay
       nada que corregir después. Sin esto, las ofertas importadas asomaban un
       instante en cada carga. */
    const effectivePrefs: Prefs = ready
        ? { condition, format, digital, international: includeInternational }
        : initialPrefs;

    /* El Select local es de valor único y no puede expresar "físico = nuevo o
       usado", así que guarda el BUCKET (o null) y el par del navbar se aplica
       aparte, como conjunto permitido. */
    const [conditionFilter, setConditionFilter] = useState<string | null>(
        selectValueFor(initialPrefs.format, initialPrefs.condition, initialPrefs.digital),
    );
    const [conditionManuallySet, setConditionManuallySet] = useState(false);
    /* Lo que el navbar permite, como conjunto de condiciones ALMACENADAS. Solo
       manda mientras el Select local esté en "Cualquier Estado": en cuanto el
       usuario elige ahí, su elección gana (ver `conditionManuallySet`). */
    const navbarAllowed = allowedConditionsFor(effectivePrefs.format, effectivePrefs.condition, effectivePrefs.digital);
    // El switch del header manda mientras el usuario no elija manualmente
    // una condición en el Select local de la tabla de precios.
    useEffect(() => {
        if (!conditionManuallySet && ready) {
            setConditionFilter(selectValueFor(format, condition, digital));
        }
    }, [condition, format, digital, conditionManuallySet, ready]);
    // Edición admin: toggles independientes para el panel del juego y por producto.
    const [editingGame, setEditingGame] = useState(false);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    useEffect(() => {
        setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    /* Tiendas con convenio interceptan la salida: en vez de navegar directo,
       se guarda la oferta pendiente y se muestra el cupón en un modal. Sin
       cupón activo, el click no toca este estado y navega como siempre. */
    const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
    const beginOffer = (product: Product) => {
        const coupon = activeCoupon(product.seller);
        if (!coupon) {
            trackEvent({ event_type: 'offer_click', product: product.id, game: game.id, platform: product.platform?.id });
            return true;
        }
        setPendingOffer({
            url: product.affiliate_url || product.url,
            productId: product.id,
            platformId: product.platform?.id,
            seller: product.seller,
            basePrice: product.base_price,
        });
        return false;
    };
    const handleOfferClick = (e: React.MouseEvent, product: Product) => {
        if (!beginOffer(product)) e.preventDefault();
    };
    const handleMobileOfferRowClick = (e: React.MouseEvent<HTMLTableRowElement>, product: Product) => {
        if (!window.matchMedia('(max-width: 47.99em)').matches) return;
        if ((e.target as HTMLElement).closest('a, [role="button"]')) return;
        if (beginOffer(product)) {
            window.open(product.affiliate_url || product.url, '_blank', 'noopener,noreferrer');
        }
    };
    const handleConfirmOffer = () => {
        if (!pendingOffer) return;
        trackEvent({
            event_type: 'offer_click',
            product: pendingOffer.productId,
            game: game.id,
            platform: pendingOffer.platformId,
        });
        window.open(pendingOffer.url, '_blank', 'noopener,noreferrer');
        setPendingOffer(null);
    };

    /* ── Popularity tracking ──
       El page_view del layout ya registra la ruta, pero normalizada a
       `/juego/[slug]`: no dice QUÉ juego se vio. Este evento es el escalón
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
        if (selectedPlatform && p.platform.slug !== selectedPlatform) return false;
        if (conditionFilter === 'digital' && conditionBucket(p.condition) !== 'digital') return false;
        if (conditionFilter?.includes('_')) {
            const families: Record<string, string[]> = {
                new_store: ['new', 'store'], new_key: ['new', 'key'],
                used_store: ['used', 'store'], used_key: ['used', 'key'],
                physical_store: ['new', 'used', 'store'], physical_key: ['new', 'used', 'key'],
                new_digital: ['new', 'store', 'key'], used_digital: ['used', 'store', 'key'],
            };
            if (!families[conditionFilter]?.includes(p.condition)) return false;
        }
        if (conditionFilter && conditionFilter !== 'digital' && !conditionFilter.includes('_') && p.condition !== conditionFilter) return false;
        if (!conditionFilter && navbarAllowed && !navbarAllowed.has(p.condition)) return false;
        if (!effectivePrefs.international && p.seller.is_international) return false;
        return true;
    });

    // Vigentes primero (por precio ascendente), sin stock al final: una oferta
    // que dejo de escrapearse no debe ganarle a una vigente por ser mas barata.
    const sorted = [...products].sort((a, b) => {
        if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
        const pa = parseFloat(a.current_price ?? '999999');
        const pb = parseFloat(b.current_price ?? '999999');
        return pa - pb;
    });

    const inStockOffers = sorted.filter((p) => p.in_stock);
    const bestProduct = inStockOffers[0] ?? null;
    // `current_price` ya viene con el envío de la tienda sumado: es el precio con
    // el que se compara y el que se ordena arriba.
    const bestPrice = bestProduct && bestProduct.current_price != null
        ? parseFloat(bestProduct.current_price)
        : null;
    const bestShipping = bestProduct ? parseFloat(bestProduct.shipping_cost ?? '0') : 0;

    // Resumen citable para motores generativos. Se arma con lo que la pantalla
    // está mostrando de verdad —consola, condición y el toggle de tiendas
    // internacionales—, no con el mínimo global del juego: si dijera otra cifra
    // que la tarjeta "Mejor Precio" de abajo, el texto estaría mintiendo.
    const geoSummary = bestProduct
        ? bestPriceSentence(game, {
            platform: platformOptions.find((p) => p.slug === selectedPlatform) ?? null,
            price: bestProduct.current_price,
            sellerName: bestProduct.seller.name,
            shipping: bestProduct.shipping_cost,
            offerCount: inStockOffers.length,
            sellerCount: new Set(inStockOffers.map((p) => p.seller.id)).size,
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
    /* La serie del mínimo llega indexada por `Platform.name`, no por `slug`
       (contrato del backend, `GameDetailSerializer`). El backend mantiene los
       dos campos idénticos por catálogo, así que el slug entra tal cual; es la
       ÚNICA frontera de esta pantalla donde no se habla de slugs. */
    /* `conditionFilter` es `null` tanto para "todos + todos" como para
       "físico + todos" (el Select de la tabla no puede distinguirlos, ver
       `selectValueFor`). Sin esto el segundo caso caía en la clave "" —la
       agregada, que incluye digital— en vez de en "physical" (unión de
       new+used que el backend ya calcula). */
    const historyConditionKey = conditionFilter ?? (
        effectivePrefs.format === 'physical' ? 'physical'
            : effectivePrefs.format === 'digital' ? 'digital'
                : ''
    );
    const minPriceSeries =
        historySource?.[selectedPlatform ?? '']?.[historyConditionKey] ?? [];

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
        const shareUrl = `${window.location.origin}${gamePath(game)}`;
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

    const breadcrumbPlatform = game.platforms.find((p) => p.slug === selectedPlatform) ?? game.platforms[0];


    return (
        <>
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
                    <Anchor component={Link} href={`/juegos/${breadcrumbPlatform.slug}`} c="dimmed" underline="never">
                        {platformLongName(breadcrumbPlatform)}
                    </Anchor>
                )}
                <Text fw={500}>{game.name}</Text>
            </Breadcrumbs>

            {/* Main layout: sidebar + content */}
            <Grid gutter="xl">
                {/* ── Sidebar: Cover + info ── */}
                <Grid.Col span={{ base: 12, lg: 4 }}>
                    {/* Cover art */}
                    <Box>
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
                                }}
                                onError={handleImageError('/placeholder-game.png')}
                            />
                        </Box>
                    </Box>

                    <Stack gap="md" mt="md">
                        {/* Info card */}
                        <Card withBorder radius="lg" p="lg">
                            <Stack gap="md">
                                {(game.ratings?.length ?? 0) > 0 && (
                                    <Box
                                        pb={(game.release_date || game.developer) ? 'sm' : 0}
                                        style={(game.release_date || game.developer)
                                            ? { borderBottom: '1px solid var(--mantine-color-default-border)' }
                                            : undefined}
                                    >
                                        <Text fz="lg" fw={700}>Calificaciones</Text>
                                        <Box mt="sm">
                                            <GameRatingsChart ratings={game.ratings ?? []} />
                                        </Box>
                                    </Box>
                                )}
                                <Stack gap="xs">
                                    {game.release_date && (
                                        <Group justify="space-between" pb={8} style={game.developer ? { borderBottom: '1px solid var(--mantine-color-default-border)' } : undefined}>
                                            <Text fz="sm" c="dimmed">Lanzamiento</Text>
                                            <Text fz="sm" fw={500}>
                                                {/* `release_date` llega como fecha pura ("YYYY-MM-DD"), que Date
                                                    interpreta como medianoche UTC. Sin fijar el timeZone acá, el
                                                    formateo cae al del entorno que ejecuta el código: el servidor
                                                    (UTC) y un navegador en Chile no coinciden, y esa medianoche cae
                                                    el día anterior en horario local — mismatch de hidratación. */}
                                                {new Date(game.release_date).toLocaleDateString('es-CL', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    timeZone: 'UTC',
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
                                paddingBottom: 0,
                                marginBottom: -16,
                            }}
                        >
                            <Group gap="sm" mb={6} wrap="wrap">
                                <Group gap="xs" wrap="nowrap">
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
                                </Group>
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
                            {platformOptions.length > 0 && (
                                <Group gap={4} mb="sm">
                                    <Box
                                        p={4}
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            borderRadius: 'var(--mantine-radius-md)',
                                            border: '1px solid var(--mantine-color-default-border)',
                                            background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTintStrong})`,
                                        }}
                                    >
                                        {platformOptions.map((pl) => {
                                            const Icon = PLATFORM_ICONS[pl.slug] || FALLBACK_PLATFORM_ICON;
                                            const pColor = PLATFORM_COLORS[pl.slug]?.mantine || 'gray';
                                            return (
                                                <Button
                                                    key={pl.id}
                                                    size="xs"
                                                    radius="sm"
                                                    variant={selectedPlatform === pl.slug ? 'filled' : 'subtle'}
                                                    color={selectedPlatform === pl.slug ? pColor : 'gray'}
                                                    leftSection={<Icon size={pl.name === 'switch' || pl.name === 'switch2' ? 15 : pl.name === 'xbox360' || pl.name === 'xboxone' || pl.name === 'xboxseries' ? 16 : 18} />}
                                                    onClick={() => setSelectedPlatform(pl.slug)}
                                                    style={{ transition: 'all 0.2s' }}
                                                >
                                                    {PLATFORM_SHORT_LABELS[pl.slug] || pl.display_name}
                                                </Button>
                                            );
                                        })}
                                    </Box>
                                </Group>
                            )}

                            {/* Action buttons */}
                            {showAdminControls && (
                                <Group gap="xs" mt="sm">
                                    <GameClickBadge stats={clickStats} />
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
                                </Group>
                            )}
                        </Box>

                        <Box mb={-16}>
                            {geoSummary ? (
                                <CollapsibleText label="Ver resumen de precios">
                                    {geoSummary}
                                </CollapsibleText>
                            ) : (
                                <Text fz="sm" c="dimmed" maw={600} lh={1.6}>
                                    Compara precios entre distintas tiendas y encuentra la mejor oferta.
                                </Text>
                            )}
                        </Box>

                        {/* ══════ Panel admin: nombre, imagen, fusión (tras "Editar juego") ══════ */}
                        {showAdminControls && editingGame && <AdminGameControls game={game} />}

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
                                        {/* El 💾 va junto al rótulo de la oferta y
                                            no pegado a la cifra: dice qué es lo
                                            que se compra, no cuánto vale.
                                            `bestProduct` ya sale del listado
                                            filtrado, así que respeta los filtros
                                            activos sin pedir nada más. */}
                                        <Group gap={8} align="center" mb="sm">
                                            <Badge
                                                color="primaryRed"
                                                variant="light"
                                                size="sm"
                                                leftSection={<IconTag size={12} />}
                                            >
                                                Mejor Precio {selectedPlatform?.toUpperCase()}
                                            </Badge>
                                            <ConditionIcon condition={bestProduct?.condition} size={16} />
                                        </Group>

                                        <Group gap="sm" align="baseline" mb="sm">
                                            <Text fz={42} fw={800} lh={1}>{bestPrice !== null ? formatCLP(bestPrice) : '—'}</Text>
                                        </Group>
                                        {conditionBucket(bestProduct.condition) === 'digital' ? (
                                            <Group gap={4} c="green.4" fz="xs" align="center">
                                                <IconCheck size={14} /> Entrega inmediata
                                                <PriceInfo
                                                    basePrice={bestProduct.base_price}
                                                    shippingCost={bestProduct.shipping_cost}
                                                    seller={bestProduct.seller}
                                                    color="green"
                                                />
                                            </Group>
                                        ) : bestShipping > 0 ? (
                                            <Group gap={4} c="green.4" fz="xs" align="center">
                                                <IconCheck size={14} /> Incluye envío promedio
                                                <PriceInfo
                                                    basePrice={bestProduct.base_price}
                                                    shippingCost={bestProduct.shipping_cost}
                                                    seller={bestProduct.seller}
                                                    color="green"
                                                />
                                            </Group>
                                        ) : (
                                            <Group gap={4} c="green.4" fz="xs" align="center">
                                                <IconCheck size={14} /> No incluye gastos de envío
                                                <PriceInfo
                                                    basePrice={bestProduct.base_price}
                                                    shippingCost={bestProduct.shipping_cost}
                                                    seller={bestProduct.seller}
                                                    color="green"
                                                />
                                            </Group>
                                        )}

                                        <Group gap="xs" mt="sm" c="rgba(255,255,255,0.7)" fz="sm">
                                            <Text>Vendido por <Anchor
                                                component="a"
                                                href={bestProduct.affiliate_url || bestProduct.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => handleOfferClick(e, bestProduct)}
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
                                            href={bestProduct.affiliate_url || bestProduct.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => handleOfferClick(e, bestProduct)}
                                            color="primaryRed"
                                            size="lg"
                                            radius="lg"
                                            rightSection={<IconExternalLink size={18} />}
                                            style={{ boxShadow: decorative.primaryButtonShadowStrong }}
                                        >
                                            Ir a la Tienda
                                        </Button>
                                        <Text fz="xs" c="rgba(255,255,255,0.5)" ta="center">
                                            {priceUpdatedDate
                                                ? `Actualizado el ${priceUpdatedDate}`
                                                : 'Fecha de actualización no disponible'}
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
                                    platformOptions.find((pl) => pl.slug === selectedPlatform)?.display_name ??
                                    selectedPlatform
                                }
                                conditionLabel={conditionFilter ? conditionLabelFor(conditionFilter) : null}
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
                                        data={PRICE_TABLE_CONDITION_OPTIONS}
                                        value={PRICE_TABLE_CONDITION_ICONS[conditionFilter ?? ''] ? conditionFilter : null}
                                        onChange={(v) => {
                                            setConditionManuallySet(true);
                                            setConditionFilter(v);
                                        }}
                                        placeholder="Filtrar por estado"
                                        clearable
                                        leftSection={(() => {
                                            const Icon = PRICE_TABLE_CONDITION_ICONS[conditionFilter ?? ''];
                                            return Icon ? <Icon size={15} /> : null;
                                        })()}
                                        renderOption={({ option }) => {
                                            const Icon = PRICE_TABLE_CONDITION_ICONS[option.value];
                                            return (
                                                <Group gap="xs" wrap="nowrap">
                                                    {Icon && <Icon size={15} />}
                                                    <span>{option.label}</span>
                                                </Group>
                                            );
                                        }}
                                        size="xs"
                                        radius="md"
                                        w={180}
                                    />
                                </Group>
                            </Box>

                            <Table.ScrollContainer minWidth={0}>
                                <Table verticalSpacing="md" horizontalSpacing="lg">
                                    <Table.Thead visibleFrom="sm">
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
                                            sorted.map((p, idx) => {
                                            const isBest = bestProduct?.id === p.id;
                                            return (
                                            <Fragment key={p.id}>
                                                <HoverCard
                                                    width={240}
                                                    position="left"
                                                    offset={12}
                                                    openDelay={120}
                                                    closeDelay={80}
                                                    withArrow
                                                    shadow="lg"
                                                    radius="md"
                                                    disabled={!p.image}
                                                    transitionProps={{
                                                        transition: {
                                                            in: { opacity: 1, transform: 'translateX(0) scale(1)' },
                                                            out: { opacity: 0, transform: 'translateX(14px) scale(0.86)' },
                                                            common: { transformOrigin: 'right center' },
                                                            transitionProperty: 'opacity, transform',
                                                        },
                                                        duration: 190,
                                                        exitDuration: 120,
                                                        timingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                                                    }}
                                                >
                                                    <HoverCard.Target>
                                                        <Table.Tr
                                                            className="game-offer-row"
                                                            style={{
                                                                transition: 'background 0.15s',
                                                                opacity: p.in_stock ? 1 : 0.55,
                                                            }}
                                                            onClick={(e) => handleMobileOfferRowClick(e, p)}
                                                        >
                                                    <Table.Td style={{ width: '100%' }}>
                                                        <Group gap="sm" wrap="nowrap">
                                                            <Anchor
                                                                component={Link}
                                                                href={`/store/${p.seller.id}`}
                                                                underline="never"
                                                                c="inherit"
                                                                // El resto de anchors de esta fila sí medían; este
                                                                // era el único sin instrumentar.
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    trackEvent({ event_type: 'store_view', seller: p.seller.id });
                                                                }}
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
                                                                href={p.affiliate_url || p.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => handleOfferClick(e, p)}
                                                                underline="never"
                                                                c="inherit"
                                                            >
                                                                <Box style={{ minWidth: 0 }}>
                                                                    <Group gap={6} wrap="nowrap" align="center" visibleFrom="sm">
                                                                        <Text fw={700} fz="sm">{p.seller.name}</Text>
                                                                        <SellerScopeBadge seller={p.seller} />
                                                                    </Group>
                                                                    <Text fw={{ base: 500, sm: 400 }} fz={{ base: 'sm', sm: 'xs' }} c="var(--mantine-color-primaryRed-5)" lineClamp={1}>
                                                                        {p.title}
                                                                    </Text>
                                                                    {!p.in_stock && (
                                                                        <Badge color="gray" variant="light" size="xs" mt={2}>
                                                                            No actualizado · Sin stock
                                                                        </Badge>
                                                                    )}
                                                                    <Group gap={2} wrap="nowrap" align="center" hiddenFrom="sm">
                                                                        <Text
                                                                            fw={700}
                                                                            fz="xl"
                                                                            c={isBest ? 'var(--mantine-color-primaryRed-5)' : undefined}
                                                                        >
                                                                            {p.current_price ? formatCLP(p.current_price) : '—'}
                                                                        </Text>
                                                                        <PriceInfo
                                                                            basePrice={p.base_price}
                                                                            shippingCost={p.shipping_cost}
                                                                            seller={p.seller}
                                                                        />
                                                                    </Group>
                                                                </Box>
                                                            </Anchor>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td hiddenFrom="sm" ta="right" style={{ whiteSpace: 'nowrap' }}>
                                                        <Badge
                                                            color={conditionBadgeColorFor(p.condition)}
                                                            variant="light"
                                                            size="lg"
                                                            aria-label={conditionLabelFor(p.condition)}
                                                            styles={{
                                                                root: { width: 34, minWidth: 34, height: 34, paddingInline: 0 },
                                                                label: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                                                            }}
                                                        >
                                                            <ConditionIcon condition={p.condition} size={18} />
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td visibleFrom="sm">
                                                        <Group gap={2} wrap="nowrap" align="center">
                                                            <Text
                                                                fw={700}
                                                                fz="md"
                                                                c={isBest ? 'var(--mantine-color-primaryRed-5)' : undefined}
                                                            >
                                                                {p.current_price ? formatCLP(p.current_price) : '—'}
                                                            </Text>
                                                            <PriceInfo
                                                                basePrice={p.base_price}
                                                                shippingCost={p.shipping_cost}
                                                                seller={p.seller}
                                                            />
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td visibleFrom="sm" style={{ whiteSpace: 'nowrap' }}>
                                                        <Badge
                                                            color={conditionBadgeColorFor(p.condition)}
                                                            variant="light"
                                                            size="sm"
                                                            styles={{ label: { overflow: 'visible' } }}
                                                            leftSection={<ConditionIcon condition={p.condition} size={12} />}
                                                        >
                                                            {conditionLabelFor(p.condition)}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td ta="right" visibleFrom="sm">
                                                        <Group gap={6} justify="flex-end" wrap="nowrap">
                                                            <MantineTooltip label="Ver en Tienda" withArrow>
                                                                <ActionIcon
                                                                    component="a"
                                                                    href={p.affiliate_url || p.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => handleOfferClick(e, p)}
                                                                    size="lg"
                                                                    radius="md"
                                                                    variant={isBest ? 'filled' : 'default'}
                                                                    color={isBest ? 'dark' : undefined}
                                                                    aria-label="Ver en Tienda"
                                                                >
                                                                    <IconExternalLink size={16} />
                                                                </ActionIcon>
                                                            </MantineTooltip>
                                                            {showAdminControls && (
                                                                <ProductClickBadge counts={clickStats?.products?.[String(p.id)]} />
                                                            )}
                                                            {showAdminControls && (
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
                                                    </HoverCard.Target>
                                                    <HoverCard.Dropdown p={8}>
                                                        <ProductImagePreview src={p.image || ''} title={p.title} />
                                                    </HoverCard.Dropdown>
                                                </HoverCard>
                                                {showAdminControls && editingProductId === p.id && (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={4} p="md">
                                                            <AdminProductEditor product={p} />
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                            </Fragment>
                                            );
                                            })
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        </Card>
                    </Stack>
                </Grid.Col>
            </Grid>
        </Container>
        <CouponModal offer={pendingOffer} onClose={() => setPendingOffer(null)} onConfirm={handleConfirmOffer} />
        </>
    );
}
