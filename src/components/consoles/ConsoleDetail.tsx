'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Alert, Anchor, Badge, Box, Breadcrumbs, Button, Card, Container, Grid, Group, Loader, Skeleton, Stack,
    Text, Title,
} from '@mantine/core';
import { IconBuildingStore, IconCheck, IconChevronRight, IconExternalLink, IconHome, IconTag } from '@tabler/icons-react';
import { useApp } from '@/context/AppContext';
import { useOutboundHref } from '@/hooks/useOutboundHref';
import CouponModal, { type PendingOffer } from '@/components/CouponModal';
import NotFoundBody from '@/components/NotFoundBody';
import PlatformBadge from '@/components/PlatformBadge';
import PriceInfo from '@/components/PriceInfo';
import { getConsole } from '@/lib/api';
import { decorative, elevation, onDark } from '@/lib/colors';
import { configurationLabel, consolePath, editionSwatch, consoleQueryString, type ConsoleDetail, type ConsoleModel, type ConsoleQuery } from '@/lib/consoles';
import { activeCoupon, platformLongName, type Product } from '@/lib/types';
import { formatCLP } from '@/lib/utils';
import { ConsoleImage, plural } from './ConsoleCard';
import { EditionSwatch } from './EditionSwatch';
import { ConsoleOfferRow, ConsoleOfferRowSkeleton, hasLivePrice } from './ConsoleOfferRow';
import { ConsoleOfferFilters, OFFER_FILTER_KEYS } from './ConsoleOfferFilters';
import { PlatformGamesLink } from './PlatformGamesLink';
import { SiblingModels, SiblingModelsSkeleton } from './SiblingModels';
import { StaffPreviewNotice } from './StaffOnly';
import { replaceQueryInUrl, useConsoleRequest } from './useConsoleRequest';
import styles from './ConsoleCatalog.module.css';

/* Without filters the comparison runs to dozens of rows; the cheapest
   ones answer the question and the rest stay one click away. */
const OFFER_PREVIEW = 10;

/** The detail's own layout (image and counter, title, model switcher, price
 *  card, filters and offers) so nothing jumps when the data arrives. */
export function ConsoleDetailSkeleton() {
    return (
        <Container size="lg" py="xl" aria-busy data-console-detail-skeleton>
            <Skeleton h={14} w={260} mb="xl" />
            <Grid gutter="xl" align="flex-start">
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Stack gap="md">
                        <Skeleton className={styles.heroMedia} radius="lg" />
                        <Skeleton h={62} radius="md" />
                    </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Stack gap="md">
                        <Skeleton h={18} w={140} />
                        <Skeleton h={38} w="65%" />
                        <SiblingModelsSkeleton />
                        <Skeleton h={14} w="50%" />
                        <BestPriceSkeleton />
                    </Stack>
                </Grid.Col>
            </Grid>
            <Card radius="xl" p={0} mt="xl">
                <div className={styles.sectionHeader}><Skeleton h={22} w={220} /></div>
                <div className={styles.offerFilters}>
                    {[220, 150, 220, 170].map((w, i) => <Skeleton key={i} h={48} w={w} radius="sm" />)}
                </div>
                {[0, 1, 2].map(i => <ConsoleOfferRowSkeleton key={i} />)}
            </Card>
        </Container>
    );
}

function BestPriceSkeleton() {
    return <Skeleton h={190} radius="xl" aria-hidden data-best-price-skeleton />;
}

function BestPriceCard({ model, best, description, editionKey, filtered, href, onOffer, loading }: {
    model: ConsoleDetail; best?: Product; description?: string; editionKey?: string; filtered: boolean; href?: string;
    onOffer: (event: MouseEvent, product: Product) => void;
    /** Other filters are loading: their best price is not this one. */
    loading?: boolean;
}) {
    if (loading) return <BestPriceSkeleton />;
    if (model.min_price == null || !best) {
        return (
            <Card radius="xl" p="lg">
                <Text fw={700} fz="xl" data-console-minimum>Sin precio disponible</Text>
                <Text fz="sm" c="dimmed" mt={4}>Ninguna tienda tiene stock con precio para esta selección.</Text>
            </Card>
        );
    }
    const gradient = decorative.bestPriceCardGradient;
    return (
        <Box p={{ base: 'lg', md: 'xl' }} pos="relative" style={{
            borderRadius: 'var(--mantine-radius-xl)', overflow: 'hidden', color: onDark.text,
            background: `linear-gradient(135deg, light-dark(${gradient.light.from}, ${gradient.dark.from}), light-dark(${gradient.light.to}, ${gradient.dark.to}))`,
        }}>
            <Box pos="absolute" top={-60} right={-60} w={240} h={240} style={{
                borderRadius: '50%', background: 'var(--mantine-color-primaryRed-5)', filter: 'blur(80px)', opacity: 0.2, pointerEvents: 'none',
            }} />
            <Group justify="space-between" align="flex-end" gap="lg" pos="relative" style={{ zIndex: 1 }}>
                <Box style={{ minWidth: 0, flex: '1 1 240px' }}>
                    <Badge color="primaryRed.6" variant="filled" size="sm" leftSection={<IconTag size={12} />} mb="sm">
                        {filtered ? 'Mejor precio con estos filtros' : 'Mejor precio'}
                    </Badge>
                    <Text fz="3xl" fw={800} lh={1} className={styles.price} data-console-minimum>{formatCLP(model.min_price)}</Text>
                    <Group gap="2xs" c={onDark.success} fz="xs" mt="sm">
                        <IconCheck size={14} />
                        {Number(best.shipping_cost ?? 0) > 0 ? 'Incluye envío promedio' : 'No incluye gastos de envío'}
                        <PriceInfo basePrice={best.base_price} shippingCost={best.shipping_cost} seller={best.seller} color="success" />
                    </Group>
                    <Text fz="sm" c={onDark.textSecondary} mt="sm">
                        En <Text span fw={700} c={onDark.text}>{best.seller.name}</Text>
                        {' · '}{best.condition === 'used' ? 'Usado' : 'Nuevo'}
                    </Text>
                    {description && <Text fz="xs" c={onDark.textSecondary} mt={2}>
                        <EditionSwatch editionKey={editionKey} size={10} />{editionSwatch(editionKey) && ' '}{description}
                    </Text>}
                </Box>
                {href && (
                    <Button component="a" href={href} target="_blank" rel="noopener noreferrer sponsored" color="primaryRed" size="lg" radius="lg"
                        rightSection={<IconExternalLink size={18} />} style={{ boxShadow: decorative.primaryButtonShadowStrong }}
                        onClick={(event: MouseEvent) => onOffer(event, best)}>
                        Ir a la tienda
                    </Button>
                )}
            </Group>
        </Box>
    );
}

export function ConsoleDetailView({ consoleId, initialData, initialGameCount, initialSiblings, initialQuery = {}, preview = false }: {
    consoleId: number;
    initialData: ConsoleDetail | null;
    /** Games of the console's platform, resolved by the server; omitted in the preview. */
    initialGameCount?: number | null;
    /** The models of the same platform, resolved by the server; omitted in the preview. */
    initialSiblings?: ConsoleModel[] | null;
    initialQuery?: ConsoleQuery;
    /** Staff preview: loads with the admin token, so it can show drafts. */
    preview?: boolean;
}) {
    const router = useRouter();
    const { condition: globalCondition } = useApp();
    const [query, setQuery] = useState(initialQuery);
    const load = useCallback((q: ConsoleQuery, signal: AbortSignal) => getConsole(consoleId, q, { signal, admin: preview }), [consoleId, preview]);
    const { data, error, missing, busy, stale, retry } = useConsoleRequest(initialData, query, load);
    const outgoingHref = useOutboundHref();
    const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
    const [showAll, setShowAll] = useState(false);

    // The preview cannot redirect on the server (it never sees the model), so
    // it fixes a stale slug here, like the public route's 308.
    useEffect(() => {
        if (!preview || !data) return;
        const path = consolePath(data);
        if (window.location.pathname !== path) router.replace(`${path}${window.location.search}`, { scroll: false });
    }, [preview, data, router]);

    const update = useCallback((patch: ConsoleQuery) => {
        // `configuration` only comes from older links: any filter replaces it.
        const next = Object.fromEntries(Object.entries({ ...query, configuration: undefined, ...patch })
            .filter(([, value]) => value !== undefined)) as ConsoleQuery;
        setShowAll(false);
        setQuery(next);
        replaceQueryInUrl(consoleQueryString(next));
    }, [query]);

    if (missing && !data) return <NotFoundBody />;
    if (!data) return busy || !error ? <ConsoleDetailSkeleton /> : (
        <Container size="lg" py="xl">
            <Alert color="danger" title="No pudimos actualizar las ofertas">
                <Button size="xs" variant="light" color="danger" onClick={retry}>Reintentar</Button>
            </Alert>
        </Container>
    );

    const model = data;
    const configurations = new Map(model.configurations.map(c => [c.id, c]));
    const filtered = OFFER_FILTER_KEYS.some(key => query[key] !== undefined);
    const live = model.products.filter(hasLivePrice);
    const retired = model.products.filter(product => !hasLivePrice(product));
    const best = live[0];
    const bestConfiguration = best ? configurations.get(best.configuration ?? 0) : undefined;
    const image = model.image || model.products.find(p => p.image)?.image || null;
    // `/go/product/<id>` looks the offer up anonymously, and the API hides the
    // offers of unpublished models: in the preview every exit answered «esta
    // oferta ya no está disponible». Staff goes straight to the store, which
    // also keeps those clicks out of the offer_click metrics.
    const offerHref = (product: Product) => preview
        ? product.affiliate_url || product.url
        : outgoingHref('product', product.id);
    /** A store with a partner coupon shows it before leaving: returns true when the modal took over. */
    const showCoupon = (product: Product) => {
        if (!activeCoupon(product.seller)) return false;
        setPendingOffer({
            url: offerHref(product), productId: product.id, platformId: product.platform?.id, seller: product.seller,
            basePrice: product.base_price, reportContext: { displayed_price: product.current_price, platform: product.platform.name },
        });
        return true;
    };
    const beginOffer = (event: MouseEvent, product: Product) => {
        if (showCoupon(product)) event.preventDefault();
    };
    // A tap on the row, as on the game page: the same exit as its button.
    const openOffer = (product: Product) => {
        if (!showCoupon(product)) window.open(offerHref(product), '_blank', 'noopener');
    };
    const row = (product: Product, index: number) => (
        <ConsoleOfferRow key={product.id} product={product} configuration={configurations.get(product.configuration ?? 0)} index={index}
            best={product.id === best?.id} href={offerHref(product)} onOffer={beginOffer} onOpen={openOffer} />
    );

    return (
        <>
            <Container size="lg" py="xl" data-ui>
                <Breadcrumbs separator={<IconChevronRight size={14} color="var(--mantine-color-dimmed)" />} mb="xl" fz="sm">
                    <Anchor component={Link} href="/" c="dimmed" underline="never"><Group gap="2xs"><IconHome size={14} /> Inicio</Group></Anchor>
                    <Anchor component={Link} href="/consolas" c="dimmed" underline="never">Consolas</Anchor>
                    <Text fw={500} fz="sm">{model.name}</Text>
                </Breadcrumbs>

                {preview && (
                    <StaffPreviewNotice>
                        {model.is_published === false
                            ? 'Borrador: este modelo no está publicado y solo lo ven los administradores.'
                            : 'Modelo publicado. Las páginas de consolas siguen visibles solo para administradores.'}
                    </StaffPreviewNotice>
                )}

                <Grid gutter="xl" align="flex-start">
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Stack gap="md">
                            <div className={styles.heroMedia} style={{ boxShadow: elevation.cover }}>
                                <ConsoleImage image={image} name={model.name} platform={model.platform.slug} priority
                                    sizes="(max-width: 62em) 90vw, 420px" />
                            </div>
                            <PlatformGamesLink platform={model.platform} initialCount={initialGameCount} />
                        </Stack>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Stack gap="md">
                            <Group gap="xs">
                                <PlatformBadge platform={model.platform} size="sm" />
                                <Text fz="sm" c="dimmed">{platformLongName(model.platform)}</Text>
                            </Group>
                            <Title order={1} fz={{ base: 28, md: 36 }} fw={800} lh={1.15}>{model.name}</Title>
                            <SiblingModels current={model} initialModels={initialSiblings} preview={preview} />
                            <Group gap="xs" c="dimmed" fz="sm" wrap="nowrap" align="flex-start">
                                <IconBuildingStore size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                <Text fz="sm">
                                    {plural(model.seller_count, 'tienda con precio vigente', 'tiendas con precio vigente')}
                                </Text>
                            </Group>
                            <BestPriceCard model={model} best={best} onOffer={beginOffer} filtered={filtered} loading={stale}
                                description={bestConfiguration ? configurationLabel(bestConfiguration) : undefined}
                                editionKey={bestConfiguration?.edition_key}
                                href={best ? offerHref(best) : undefined} />
                            {model.description && (
                                <details className="pio-details">
                                    <summary>Acerca de esta consola</summary>
                                    <Text fz="sm" mt="xs" style={{ whiteSpace: 'pre-line' }}>{model.description}</Text>
                                </details>
                            )}
                        </Stack>
                    </Grid.Col>
                </Grid>

                <Stack gap="xl" mt="xl">
                    <Card radius="xl" p={0} component="section" aria-labelledby="console-offers" aria-busy={busy}>
                        <div className={styles.sectionHeader}>
                            <Group gap="xs">
                                <IconTag size={22} color="var(--mantine-color-primaryRed-5)" aria-hidden />
                                <Title order={2} id="console-offers" fz="lg" fw={700}>Compara las ofertas</Title>
                                {!stale && <Text fz="sm" c="dimmed">{plural(live.length, 'oferta', 'ofertas')}</Text>}
                                {busy && <Loader size="xs" color="primaryRed" aria-label="Actualizando ofertas" />}
                            </Group>
                        </div>
                        <ConsoleOfferFilters configurations={model.configurations} query={query} globalCondition={globalCondition}
                            onChange={update} />
                        {error && (
                            <Alert color="danger" title="No pudimos actualizar las ofertas" m="lg">
                                <Group gap="sm">
                                    <Text fz="sm">Inténtalo nuevamente para consultar precios vigentes.</Text>
                                    <Button size="xs" variant="light" color="danger" onClick={retry}>Reintentar</Button>
                                </Group>
                            </Alert>
                        )}
                        {stale ? (
                            // Other filters: these rows would show the previous selection.
                            Array.from({ length: Math.min(Math.max(live.length, 3), 5) }, (_, i) => <ConsoleOfferRowSkeleton key={i} />)
                        ) : <>
                            {(showAll ? live : live.slice(0, OFFER_PREVIEW)).map(row)}
                            {!showAll && live.length > OFFER_PREVIEW && (
                                <Box p="md" ta="center" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                                    <Button variant="subtle" color="primaryRed" onClick={() => setShowAll(true)}>
                                        Ver {plural(live.length - OFFER_PREVIEW, 'oferta más', 'ofertas más')}
                                    </Button>
                                </Box>
                            )}
                            {model.products.length === 0 && <Text p="lg" c="dimmed">No hay ofertas para esta selección.</Text>}
                            {live.length === 0 && retired.length > 0 && <Text p="lg" c="dimmed">No hay ofertas vigentes para esta selección.</Text>}
                            {retired.length > 0 && (
                                <details className={styles.soldOut}>
                                    <summary>{plural(retired.length, 'oferta agotada', 'ofertas agotadas')} o sin precio</summary>
                                    {retired.map((product, i) => row(product, live.length + i))}
                                </details>
                            )}
                        </>}
                    </Card>
                </Stack>
            </Container>
            <CouponModal offer={pendingOffer} onClose={() => setPendingOffer(null)}
                onConfirm={() => window.setTimeout(() => setPendingOffer(null), 0)} />
        </>
    );
}
