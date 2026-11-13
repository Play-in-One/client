'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import {
    Anchor, Badge, Box, Breadcrumbs, Button, Card, Container, Group, SimpleGrid, Skeleton, Stack, Text, Title,
} from '@mantine/core';
import { IconCheck, IconChevronDown, IconChevronRight, IconHome, IconTag } from '@tabler/icons-react';
import RemoteImage from '@/components/RemoteImage';
import ConditionIcon from '@/components/ConditionIcon';
import SeedImage from '@/components/skeleton/SeedImage';
import { MinPriceChartLoading } from '@/components/MinPriceChartFrame';
import SkeletonLine from '@/components/skeleton/SkeletonLine';
import { decorative, elevation, onDark, surfaces } from '@/lib/colors';
import { conditionBucket } from '@/lib/conditions';
import { PLATFORM_ICONS, PLATFORM_SHORT_LABELS, FALLBACK_PLATFORM_ICON } from '@/lib/platformIcons';
import { platformLongName, type Platform } from '@/lib/types';
import { formatCLP, PLATFORM_COLORS } from '@/lib/utils';
import { useSeed } from '@/lib/navigationSeed';
import GameActions from './GameActions';

/*
 * La cabecera de la ficha de juego, en piezas que comparten TODAS sus fases:
 *
 *   overlay instantáneo (semilla de la tarjeta) → `loading.tsx` (semilla o
 *   esqueleto) → `GamePreviewShell` (preview del servidor) → `GameDetailClient`
 *
 * Antes cada fase escribía su propio marcado: `loading.tsx` era un Flex de
 * dos columnas, el shell una tarjeta con borde y padding xl, y la ficha real
 * una caja sin borde con radio xl. El precio saltaba 64 px entre el shell y la
 * ficha y la página entera se reacomodaba dos veces. Ahora la ficha real usa
 * estos mismos marcos y las fases previas solo cambian su CONTENIDO (dato o
 * esqueleto), nunca la caja.
 *
 * Todo lo que se mide (márgenes, paddings, radios, interlineados) vive en los
 * marcos. Quien los usa pasa solo el contenido de cada hueco.
 */

export const GAME_COVER_SIZES = '(max-width: 768px) 30vw, (max-width: 1200px) 85vw, 380px';
/** La misma portada, más ancha, para `HiResCover` (se pide tras la carga). */
export const GAME_COVER_HIRES_SIZES = '(max-width: 768px) 50vw, (max-width: 1200px) 85vw, 540px';

const BEST_PRICE_BACKGROUND = `linear-gradient(135deg, light-dark(${decorative.bestPriceCardGradient.light.from}, ${decorative.bestPriceCardGradient.dark.from}), light-dark(${decorative.bestPriceCardGradient.light.to}, ${decorative.bestPriceCardGradient.dark.to}))`;

/** Inicio › Consola › Juego. Con `linked={false}` (fases previas) son textos
 *  con la misma tipografía: el overlay no debe tener enlaces que naveguen
 *  desde la página que está tapando. */
export function GameBreadcrumbs({ platform, name, linked = true }: {
    platform?: Platform | null;
    name?: string | null;
    linked?: boolean;
}) {
    const crumb = (href: string, children: ReactNode) => linked
        ? <Anchor component={Link} href={href} c="dimmed" underline="never">{children}</Anchor>
        : <Anchor component="span" c="dimmed" underline="never" style={{ cursor: 'default' }}>{children}</Anchor>;
    return (
        <Breadcrumbs separator={<IconChevronRight size={14} color="var(--mantine-color-dimmed)" />} mb="xl" fz="sm">
            {crumb('/', <Group gap="2xs"><IconHome size={14} /> Inicio</Group>)}
            {platform ? crumb(`/juegos/${platform.slug}`, platformLongName(platform)) : null}
            {name ? <Text fw={500}>{name}</Text> : <Text component="div"><SkeletonLine width={140} /></Text>}
        </Breadcrumbs>
    );
}

/** La portada 3:4 con su sombra y borde. */
export function GameCoverFrame({ children }: { children: ReactNode }) {
    return (
        <Box className="pio-game-cover">
            <Box
                pos="relative"
                maw={{ base: '85%', lg: '100%' }}
                mx={{ base: 'auto', lg: 0 }}
                style={{
                    borderRadius: 'var(--mantine-radius-lg)',
                    overflow: 'hidden',
                    boxShadow: elevation.cover,
                    border: '1px solid var(--mantine-color-default-border)',
                    aspectRatio: '3/4',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

/** La tarjeta "Información del juego": en móvil y tablet es un desplegable
 *  cerrado (la misma altura en todas las fases); en escritorio, su cuerpo. */
export function GameInfoCardFrame({ open, onToggle, children }: {
    open?: boolean;
    onToggle?: () => void;
    children: ReactNode;
}) {
    return (
        <Card p="lg" className="pio-game-info" data-open={open ?? false}>
            <button type="button" className="pio-game-info-toggle" aria-expanded={open ?? false}
                aria-controls="game-info-body" onClick={onToggle} disabled={!onToggle}>
                Información del juego <IconChevronDown size={16} aria-hidden />
            </button>
            <div id="game-info-body" className="pio-game-info-body">{children}</div>
        </Card>
    );
}

/** Título fijo bajo el navbar: acciones y géneros, el `h1` y el selector de
 *  consola. `extra` es lo que la ficha real añade debajo (controles de staff). */
export function GameTitleFrame({ actions, genres, name, selector, extra }: {
    actions: ReactNode;
    genres?: ReactNode;
    name: ReactNode;
    selector?: ReactNode;
    extra?: ReactNode;
}) {
    return (
        <Box className="pio-game-title"
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
            <Group gap="sm" mb="2xs" wrap="wrap">
                <Group gap="xs" wrap="nowrap">{actions}</Group>
                {/* En un teléfono los géneros van en la tarjeta de información
                    (`.pio-game-genres`, ver globals.css): en la columna del
                    título, de ~230 px, pasaban a una segunda fila al llegar la
                    ficha completa (ni la tarjeta ni el preview los conocen) y
                    empujaban el nombre, las consolas y el precio. */}
                {genres && <span className="pio-game-genres">{genres}</span>}
            </Group>
            <Title order={1} fz={{ base: 28, md: 36 }} fw={800} mb="sm">{name}</Title>
            {selector}
            {extra}
        </Box>
    );
}

/** La caja con borde del selector de consola. */
export function PlatformSelectorFrame({ children }: { children: ReactNode }) {
    return (
        <Group gap="2xs" mb="sm">
            <Box
                p="2xs"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    borderRadius: 'var(--mantine-radius-md)',
                    border: '1px solid var(--mantine-color-default-border)',
                    background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTintStrong})`,
                }}
            >
                {children}
            </Box>
        </Group>
    );
}

export function platformIconSize(slug: string): number {
    return slug === 'switch' || slug === 'switch2' ? 15
        : slug === 'xbox360' || slug === 'xboxone' || slug === 'xboxseries' ? 16 : 18;
}

/** Un botón del selector. Sin `onSelect` no hace nada (fases previas). */
export function PlatformOption({ platform, selected, onSelect }: {
    platform: Pick<Platform, 'id' | 'slug' | 'display_name'>;
    selected: boolean;
    onSelect?: () => void;
}) {
    const Icon = PLATFORM_ICONS[platform.slug] || FALLBACK_PLATFORM_ICON;
    return (
        <Button
            size="xs"
            radius="sm"
            variant={selected ? 'filled' : 'subtle'}
            color={selected ? PLATFORM_COLORS[platform.slug]?.mantine || 'gray' : 'gray'}
            leftSection={<Icon size={platformIconSize(platform.slug)} />}
            onClick={onSelect}
            tabIndex={onSelect ? undefined : -1}
            style={{ transition: 'all 0.2s', ...(onSelect ? {} : { pointerEvents: 'none' }) }}
        >
            {PLATFORM_SHORT_LABELS[platform.slug] || platform.display_name}
        </Button>
    );
}

/** La caja del mejor precio: degradado, padding y las dos columnas (una en
 *  móvil). Cada hueco va dentro del mismo `Text`/`Group` que en la ficha
 *  real, así que su alto lo pone la tipografía y no el contenido. */
export function BestPriceFrame({ badge, price, delivery, seller, title, cta, date, style }: {
    badge: ReactNode;
    price: ReactNode;
    delivery: ReactNode;
    seller: ReactNode;
    title: ReactNode;
    cta: ReactNode;
    date: ReactNode;
    style?: CSSProperties;
}) {
    return (
        <Box className="pio-game-best-price" data-best-price
            p={{ base: 'lg', md: 'xl' }}
            style={{
                borderRadius: 'var(--mantine-radius-xl)',
                background: BEST_PRICE_BACKGROUND,
                color: onDark.text,
                position: 'relative',
                overflow: 'hidden',
                ...style,
            }}
        >
            {/* Decorative circle */}
            <Box pos="absolute" top={-60} right={-60} w={240} h={240} style={{
                borderRadius: '50%', background: 'var(--mantine-color-primaryRed-5)', filter: 'blur(80px)', opacity: 0.2, pointerEvents: 'none',
            }} />
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" style={{ position: 'relative', zIndex: 1 }}>
                <Box>
                    <Group gap={8} align="center" mb="sm" mih={18}>{badge}</Group>
                    <Group gap="sm" align="baseline" mb="sm">
                        <Text component="div" fz="3xl" fw={800} lh={1} data-best-price-amount>{price}</Text>
                    </Group>
                    <Group gap="2xs" c={onDark.success} fz="xs" align="center" mih={18.6}>{delivery}</Group>
                    <Group gap="xs" mt="sm" c={onDark.textSecondary} fz="sm">{seller}</Group>
                    <Text component="div" fz="xs" c={onDark.textSecondary} mt="2xs" fs="italic">{title}</Text>
                </Box>
                <Stack align="stretch" justify="center" gap="sm">
                    <Group gap="xs" wrap="nowrap">{cta}</Group>
                    <Text component="div" fz="xs" c={onDark.textSecondary} ta="center">{date}</Text>
                </Stack>
            </SimpleGrid>
        </Box>
    );
}

/** El esqueleto de lo que va bajo el precio: la tarjeta del historial (con su
 *  alto real, ~330 px) y la de la comparativa con tres filas. */
export function GameOffersSkeleton({ platformLabel }: { platformLabel?: string | null } = {}) {
    const header = (width: number) => (
        <Box p="lg" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            <Group justify="space-between" wrap="wrap" gap="md" mih={30}>
                <Title order={3} component="div" fz="lg" fw={700}><SkeletonLine width={width} /></Title>
                <Skeleton h={30} w={180} radius="md" />
            </Group>
        </Box>
    );
    return <>
        {/* El historial se ve ya como tarjeta, con su icono de carga. */}
        <MinPriceChartLoading platformLabel={platformLabel} />
        <Card radius="xl" p={0} style={{ overflow: 'hidden' }} aria-hidden data-skeleton="offers">
            {header(210)}
            {[0, 1, 2].map((row) => (
                <Group key={row} px="lg" py="md" gap="sm" wrap="nowrap" style={{ borderTop: row ? '1px solid var(--mantine-color-default-border)' : undefined }}>
                    <Skeleton h={40} w={40} radius="sm" style={{ flexShrink: 0 }} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text component="div" fz="sm" fw={700}><SkeletonLine width="35%" /></Text>
                        <Text component="div" fz="xs"><SkeletonLine width="60%" /></Text>
                    </Box>
                    <Skeleton h={36} w={110} radius="md" />
                </Group>
            ))}
        </Card>
    </>;
}

/** Lo que una fase previa sabe del juego. Todo es opcional: lo que falta se
 *  pinta como esqueleto del tamaño exacto. */
export interface GameHeroData {
    id?: number;
    name?: string | null;
    /** Para el enlace de «compartir» (ver `GameActions`). */
    slug?: string | null;
    image?: string | null;
    /** La portada que la tarjeta ya tenía decodificada (ver `SeedImage`). */
    placeholderSrc?: string;
    platforms?: Platform[];
    selectedPlatform?: string | null;
    /** Precio efectivo, con envío. */
    price?: string | null;
    shipping?: string | null;
    condition?: string | null;
    seller?: string | null;
}

/**
 * La cabecera completa a partir de datos parciales: la usan el overlay
 * instantáneo, `loading.tsx` y `GamePreviewShell`. `status` reemplaza al
 * esqueleto de ofertas (el "Cargando…" del shell o su "Reintentar").
 */
export function GameHeroFrame({ data, status }: { data: GameHeroData; status?: ReactNode }) {
    // La portada que la tarjeta clicada ya decodificó, si se llegó así (en un
    // documento siempre null): el preview del servidor la hereda sin pedirla.
    const seed = useSeed('game', data.id);
    const placeholderSrc = data.placeholderSrc ?? seed?.placeholderSrc;
    const platforms = data.platforms ?? [];
    const breadcrumbPlatform = platforms.find((p) => p.slug === data.selectedPlatform) ?? platforms[0];
    const hasPrice = data.price != null && Number(data.price) > 0;
    const shipping = Number(data.shipping ?? 0);
    const delivery = data.condition && conditionBucket(data.condition) === 'digital'
        ? 'Entrega inmediata'
        : shipping > 0 ? 'Incluye envío promedio' : 'No incluye gastos de envío';
    return (
        <Container size="lg" py="xl" data-game-hero data-game-preview>
            <GameBreadcrumbs platform={breadcrumbPlatform} name={data.name} linked={false} />
            <div className="pio-game-layout">
                <div className="pio-game-sidebar">
                    <GameCoverFrame>
                        {data.image !== undefined || placeholderSrc ? <>
                            <SeedImage src={placeholderSrc} />
                            <RemoteImage src={data.image ?? null} alt={data.name ?? ''} priority
                                sizes={GAME_COVER_SIZES} style={{ objectFit: 'cover' }} />
                        </> : <Skeleton radius={0} style={{ position: 'absolute', inset: 0, height: 'auto' }} />}
                    </GameCoverFrame>
                    <GameInfoCardFrame>
                        <Stack gap="xs" aria-hidden>
                            <Text component="div" fz="sm"><SkeletonLine width="80%" /></Text>
                            <Text component="div" fz="sm"><SkeletonLine width="65%" /></Text>
                            <Text component="div" fz="sm"><SkeletonLine width="72%" /></Text>
                        </Stack>
                    </GameInfoCardFrame>
                </div>
                <div className="pio-game-content">
                    <Stack gap="xl" className="pio-game-stack">
                        <GameTitleFrame
                            actions={<GameActions game={data.id && data.name ? { id: data.id, name: data.name, slug: data.slug } : null} />}
                            name={data.name ?? <SkeletonLine width="70%" />}
                            selector={platforms.length > 0 ? (
                                <PlatformSelectorFrame>
                                    {platforms.map((p) => <PlatformOption key={p.id} platform={p} selected={p.slug === data.selectedPlatform} />)}
                                </PlatformSelectorFrame>
                            ) : (
                                <PlatformSelectorFrame><Skeleton h={30} w={170} radius="sm" /></PlatformSelectorFrame>
                            )}
                        />
                        <BestPriceFrame
                            badge={hasPrice && data.selectedPlatform ? <>
                                <Badge color="primaryRed.6" variant="filled" size="sm" leftSection={<IconTag size={12} />}>
                                    Mejor Precio {data.selectedPlatform.toUpperCase()}
                                </Badge>
                                <ConditionIcon condition={data.condition ?? undefined} size={16} />
                            </> : <Skeleton h={18} w={150} radius="xl" />}
                            price={hasPrice ? formatCLP(data.price!) : <SkeletonLine width="45%" />}
                            delivery={hasPrice ? <><IconCheck size={14} /> {delivery}</> : <SkeletonLine width={150} />}
                            seller={<Text component="div">{hasPrice && data.seller
                                ? <>Vendido por <Text span fw={700} c={onDark.text}>{data.seller}</Text></>
                                : <SkeletonLine width={170} />}</Text>}
                            title={<SkeletonLine width="70%" />}
                            cta={<Skeleton h={50} radius="lg" style={{ flex: 1 }} />}
                            date={<SkeletonLine width={190} />}
                        />
                        {status ?? <GameOffersSkeleton platformLabel={data.selectedPlatform ? PLATFORM_SHORT_LABELS[data.selectedPlatform] ?? null : null} />}
                    </Stack>
                </div>
            </div>
        </Container>
    );
}
