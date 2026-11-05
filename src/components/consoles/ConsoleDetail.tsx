'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Alert, Anchor, Badge, Box, Breadcrumbs, Button, Card, Container, Grid, Group, Loader, SegmentedControl, Skeleton, Stack,
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
import { configurationLabel, consolePath, consoleQueryString, type ConsoleDetail, type ConsoleQuery } from '@/lib/consoles';
import { activeCoupon, platformLongName, type Product } from '@/lib/types';
import { formatCLP } from '@/lib/utils';
import { ConsoleImage, plural } from './ConsoleCard';
import { ConsoleOfferRow, hasLivePrice } from './ConsoleOfferRow';
import { ConsolePackPicker } from './ConsolePackPicker';
import { StaffPreviewNotice } from './StaffOnly';
import { replaceQueryInUrl, useConsoleRequest } from './useConsoleRequest';
import styles from './ConsoleCatalog.module.css';

/* With every pack listed the comparison runs to dozens of rows; the cheapest
   ones answer the question and the rest stay one click away. */
const OFFER_PREVIEW = 10;

export function ConsoleDetailSkeleton() {
    return (
        <Container size="lg" py="xl" aria-busy>
            <Skeleton h={14} w={220} mb="xl" />
            <Grid gutter="xl">
                <Grid.Col span={{ base: 12, md: 5 }}><Skeleton style={{ aspectRatio: '4 / 3' }} radius="lg" /></Grid.Col>
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Stack gap="md"><Skeleton h={18} w={90} /><Skeleton h={36} w="70%" /><Skeleton h={170} radius="xl" /></Stack>
                </Grid.Col>
            </Grid>
            <Skeleton h={220} radius="xl" mt="xl" />
        </Container>
    );
}

function BestPriceCard({ model, best, packLabel, packSelected, href, onOffer }: {
    model: ConsoleDetail; best?: Product; packLabel?: string; packSelected: boolean; href?: string; onOffer: (event: MouseEvent, product: Product) => void;
}) {
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
                        {packSelected ? 'Mejor precio de este pack' : 'Mejor precio'}
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
                    {packLabel && <Text fz="xs" c={onDark.textSecondary} mt={2}>{packLabel}</Text>}
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

export function ConsoleDetailView({ consoleId, initialData, initialQuery = {}, preview = false }: {
    consoleId: number;
    initialData: ConsoleDetail | null;
    initialQuery?: ConsoleQuery;
    /** Staff preview: loads with the admin token, so it can show drafts. */
    preview?: boolean;
}) {
    const router = useRouter();
    const { condition: globalCondition } = useApp();
    const [query, setQuery] = useState(initialQuery);
    const load = useCallback((q: ConsoleQuery, signal: AbortSignal) => getConsole(consoleId, q, { signal, admin: preview }), [consoleId, preview]);
    const { data, error, missing, busy, retry } = useConsoleRequest(initialData, query, load);
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
        const next = Object.fromEntries(Object.entries({ ...query, ...patch })
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
    const selected = query.configuration !== undefined ? configurations.get(query.configuration) : undefined;
    const live = model.products.filter(hasLivePrice);
    const retired = model.products.filter(product => !hasLivePrice(product));
    const best = live[0];
    const bestConfiguration = best ? configurations.get(best.configuration ?? 0) : undefined;
    const image = model.image || model.products.find(p => p.image)?.image || null;
    const basePath = consolePath(model);
    const beginOffer = (event: MouseEvent, product: Product) => {
        const coupon = activeCoupon(product.seller);
        if (!coupon) return;
        event.preventDefault();
        setPendingOffer({
            url: outgoingHref('product', product.id), productId: product.id, platformId: product.platform?.id, seller: product.seller,
            basePrice: product.base_price, reportContext: { displayed_price: product.current_price, platform: product.platform.name },
        });
    };
    const row = (product: Product, index: number) => (
        <ConsoleOfferRow key={product.id} product={product} configuration={configurations.get(product.configuration ?? 0)} index={index}
            best={product.id === best?.id} showPack={!selected} href={outgoingHref('product', product.id)} onOffer={beginOffer} />
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

                <Grid gutter="xl" align="center">
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <div className={styles.heroMedia} style={{ boxShadow: elevation.cover }}>
                            <ConsoleImage image={image} name={model.name} platform={model.platform.slug} priority
                                sizes="(max-width: 62em) 90vw, 420px" />
                        </div>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Stack gap="md">
                            <Group gap="xs">
                                <PlatformBadge platform={model.platform} size="sm" />
                                <Text fz="sm" c="dimmed">{platformLongName(model.platform)}</Text>
                            </Group>
                            <Title order={1} fz={{ base: 28, md: 36 }} fw={800} lh={1.15}>{model.name}</Title>
                            <Group gap="xs" c="dimmed" fz="sm" wrap="nowrap" align="flex-start">
                                <IconBuildingStore size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                <Text fz="sm">
                                    {plural(model.seller_count, 'tienda con precio vigente', 'tiendas con precio vigente')}
                                    {' · '}{plural(model.configurations.length, 'configuración', 'configuraciones')}
                                </Text>
                            </Group>
                            <BestPriceCard model={model} best={best} onOffer={beginOffer} packSelected={!!selected}
                                packLabel={selected ? configurationLabel(selected) : bestConfiguration ? configurationLabel(bestConfiguration) : undefined}
                                href={best ? outgoingHref('product', best.id) : undefined} />
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
                    {model.configurations.length > 0 && (
                        <ConsolePackPicker configurations={model.configurations} sellerCount={model.seller_count} query={query} basePath={basePath}
                            onSelect={configuration => update({ configuration, edition: undefined, storage_gb: undefined, has_game: undefined })} />
                    )}

                    <Card radius="xl" p={0} component="section" aria-labelledby="console-offers" aria-busy={busy}>
                        <div className={styles.sectionHeader}>
                            <Group gap="xs">
                                <IconTag size={22} color="var(--mantine-color-primaryRed-5)" aria-hidden />
                                <Title order={2} id="console-offers" fz="lg" fw={700}>Compara las ofertas</Title>
                                <Text fz="sm" c="dimmed">{plural(live.length, 'oferta', 'ofertas')}{selected ? ` · ${configurationLabel(selected)}` : ''}</Text>
                                {busy && <Loader size="xs" color="primaryRed" aria-label="Actualizando ofertas" />}
                            </Group>
                            <SegmentedControl size="xs" aria-label="Condición" value={query.condition ?? 'any'}
                                onChange={value => update({ condition: value === 'any' ? undefined : value as 'new' | 'used' })}
                                data={[{ value: 'any', label: globalCondition === 'all' ? 'Todas' : 'Según preferencia' },
                                    { value: 'new', label: 'Nuevo' }, { value: 'used', label: 'Usado' }]} />
                        </div>
                        {error && (
                            <Alert color="danger" title="No pudimos actualizar las ofertas" m="lg">
                                <Group gap="sm">
                                    <Text fz="sm">Inténtalo nuevamente para consultar precios vigentes.</Text>
                                    <Button size="xs" variant="light" color="danger" onClick={retry}>Reintentar</Button>
                                </Group>
                            </Alert>
                        )}
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
                    </Card>
                </Stack>
            </Container>
            <CouponModal offer={pendingOffer} onClose={() => setPendingOffer(null)}
                onConfirm={() => window.setTimeout(() => setPendingOffer(null), 0)} />
        </>
    );
}
