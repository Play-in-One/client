'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Box,
    Stack,
    Button,
    ActionIcon,
    Center,
    Loader,
    Group,
} from '@mantine/core';
import { IconBookmark, IconX, IconDeviceGamepad } from '@tabler/icons-react';
import GameCard from '@/components/GameCard';
import { useApp } from '@/context/AppContext';
import { allowedConditionsFor, type ConditionFilter, type FormatFilter } from '@/lib/prefs';
import { getGame } from '@/lib/api';
import type { Game, Platform } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/utils';
import { PLATFORM_ICONS, PLATFORM_SHORT_LABELS, PLATFORM_LONG_LABELS } from '@/lib/platformIcons';
import { surfaces } from '@/lib/colors';

/** Juego con imagen/precio resueltos para los filtros activos: misma regla que
 * GameDetailClient usa para su portada — el producto más barato entre los que
 * pasan el filtro (o el más barato con foto, si el más barato no tiene).
 *
 * Los filtros GLOBALES entran aquí igual que el de consola. `getGame()` devuelve
 * el catálogo entero del juego sin acotar —la preferencia vive en el cliente—,
 * así que sin esto los guardados eran la única vista donde las tiendas
 * internacionales seguían contando con el toggle apagado. */
function resolveForFilters(
    game: Game,
    platformSlugs: string[],
    prefs: { condition: ConditionFilter; format: FormatFilter; international: boolean },
): Game {
    /* El conjunto permitido sale del mismo sitio que el `?condition=` de la
       API, así que la galería y esta vista no pueden interpretar el par de
       filtros de dos maneras distintas. `null` = no acota. */
    const allowed = allowedConditionsFor(prefs.format, prefs.condition);
    const noFilters = platformSlugs.length === 0 && !allowed && prefs.international;
    if (noFilters) return game;

    const matching = (game.products ?? []).filter((p) => {
        if (platformSlugs.length > 0 && !platformSlugs.includes(p.platform.slug)) return false;
        if (allowed && !allowed.has(p.condition)) return false;
        if (!prefs.international && p.seller.is_international) return false;
        return true;
    });
    if (matching.length === 0) return game;

    const sorted = [...matching].sort(
        (a, b) => parseFloat(a.current_price ?? '999999') - parseFloat(b.current_price ?? '999999'),
    );
    const bestProduct = sorted[0];
    const image = game.image_is_custom ? game.image : sorted.find((p) => p.image)?.image ?? game.image;

    // El desglose viaja junto al precio: si se recalcula el mínimo y se deja el
    // del backend, el ícono de info explicaría una cifra que ya no se muestra.
    return {
        ...game,
        image,
        min_price: bestProduct.current_price,
        min_price_base: bestProduct.base_price,
        min_price_shipping: bestProduct.shipping_cost,
        // Va con el resto del desglose: sin esto la tarjeta pintaría el 💾 del
        // ganador SIN filtrar que mandó el backend, al lado del precio del
        // ganador ya filtrado que se acaba de recalcular aquí.
        min_price_condition: bestProduct.condition,
    };
}

export default function SavedClient() {
    const { savedGames, removeSaved, condition, format, includeInternational } = useApp();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [platformFilter, setPlatformFilter] = useState<string[]>([]);

    // Resuelve los datos actuales (imagen, precio, plataformas) contra la API en
    // cada visita: localStorage solo guarda el id, así que la carátula y el
    // precio siempre reflejan el catálogo actual en vez de un snapshot viejo.
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all(
            savedGames.map((sg) =>
                getGame(sg.id).catch(() => null),
            ),
        ).then((results) => {
            if (cancelled) return;
            // Un juego eliminado/fusionado en el backend simplemente no aparece.
            setGames(results.filter((g): g is Game => g !== null));
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [savedGames]);

    const availablePlatforms = Array.from(
        games.reduce((map, g) => {
            g.platforms.forEach((p) => map.set(p.slug, p));
            return map;
        }, new Map<string, Platform>()).values(),
    );

    const togglePlatform = (slug: string) => {
        setPlatformFilter((prev) =>
            prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
        );
    };

    const visibleGames = (
        platformFilter.length === 0
            ? games
            : games.filter((g) => g.platforms.some((p) => platformFilter.includes(p.slug)))
    )
        .map((g) => resolveForFilters(g, platformFilter, {
            condition,
            format,
            international: includeInternational,
        }))
        .sort((a, b) => (a.developer || '').localeCompare(b.developer || ''));

    return (
        <Container size="lg" py="xl">
            <Title order={1} fz={{ base: 24, md: 32 }} fw={800} mb="xs">
                Juegos Guardados
            </Title>
            <Text c="dimmed" mb="xl">
                Los juegos que guardes se almacenan solo en este navegador.
            </Text>

            {loading ? (
                <Center py={60}>
                    <Loader />
                </Center>
            ) : games.length === 0 ? (
                <Stack align="center" py={60} gap="sm">
                    <IconBookmark size={48} color="var(--mantine-color-dimmed)" />
                    <Text fw={600}>Aún no has guardado ningún juego</Text>
                    <Text c="dimmed" fz="sm" ta="center" maw={360}>
                        Toca el ícono de marcador en cualquier juego para guardarlo aquí.
                    </Text>
                    <Button component={Link} href="/search" variant="light" mt="sm">
                        Explorar juegos
                    </Button>
                </Stack>
            ) : (
                <>
                    {availablePlatforms.length > 1 && (
                        <Group justify="center" mb="lg">
                            <Box
                                p={4}
                                style={{
                                    display: 'inline-flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    borderRadius: 'var(--mantine-radius-md)',
                                    border: '1px solid var(--mantine-color-default-border)',
                                    background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTintStrong})`,
                                }}
                            >
                                {availablePlatforms.map((p) => {
                                    const Icon = PLATFORM_ICONS[p.name] || IconDeviceGamepad;
                                    const pColor = PLATFORM_COLORS[p.name]?.mantine || 'gray';
                                    const active = platformFilter.includes(p.slug);
                                    return (
                                        <Button
                                            key={p.slug}
                                            size="xs"
                                            radius="sm"
                                            variant={active ? 'filled' : 'subtle'}
                                            color={active ? pColor : 'gray'}
                                            leftSection={<Icon size={18} />}
                                            onClick={() => togglePlatform(p.slug)}
                                            style={{ transition: 'all 0.2s' }}
                                        >
                                            <Text span hiddenFrom="xs" fz="xs" fw={700} inherit>
                                                {PLATFORM_SHORT_LABELS[p.name] || p.display_name}
                                            </Text>
                                            <Text span visibleFrom="xs" fz="xs" fw={700} inherit>
                                                {PLATFORM_LONG_LABELS[p.name] || p.display_name}
                                            </Text>
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Group>
                    )}

                    <SimpleGrid data-prefs-dependent cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', xs: 'lg' }}>
                        {visibleGames.map((game) => (
                            <Box key={game.id} pos="relative">
                                <ActionIcon
                                    variant="filled"
                                    color="dark"
                                    size="sm"
                                    radius="xl"
                                    pos="absolute"
                                    top={12}
                                    right={12}
                                    style={{ zIndex: 3 }}
                                    aria-label="Quitar de guardados"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeSaved(game.id);
                                    }}
                                >
                                    <IconX size={14} />
                                </ActionIcon>
                                <GameCard game={game} />
                            </Box>
                        ))}
                    </SimpleGrid>
                </>
            )}
        </Container>
    );
}
