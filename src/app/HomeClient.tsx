'use client';

import { startTransition, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Container,
    Box,
    Title,
    Text,
    TextInput,
    Button,
    Group,
    SimpleGrid,
    Card,
    Anchor,
    Badge,
    Stack,
    Skeleton,
} from '@mantine/core';
import {
    IconSearch,
    IconFlame,
    IconArrowRight,
    IconDeviceGamepad,
} from '@tabler/icons-react';
import type { Post, Game, Saga } from '@/lib/types';
import { PLATFORM_GROUPS } from '@/lib/platformGroups';
import { surfaces, decorative } from '@/lib/colors';
import { getTrendingGames, getFeaturedGames, trackEvent } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import GameCard from '@/components/GameCard';
import SagaLogo from '@/components/SagaLogo';
import AdSlot from '@/components/AdSlot';
import { AD_SLOT_HOME_FOOTER } from '@/lib/ads';
import FeaturedGamesCarousel from '@/components/FeaturedGamesCarousel';

/* Skeleton de la grilla de Populares — mismas proporciones que GameCard,
   mismo patrón visual que search/loading.tsx. */
function TrendingGridSkeleton() {
    return (
        <SimpleGrid cols={{ base: 2, xs: 2, md: 4 }} spacing={{ base: 'xs', xs: 'lg' }}>
            {Array.from({ length: 8 }).map((_, i) => (
                <Box key={i}>
                    <Skeleton radius="lg" style={{ aspectRatio: '3/4', width: '100%' }} />
                    <Stack gap={6} mt="sm">
                        <Skeleton height={10} width="40%" radius="sm" />
                        <Skeleton height={14} width="80%" radius="sm" />
                        <Skeleton height={22} width="55%" radius="sm" mt={4} />
                    </Stack>
                </Box>
            ))}
        </SimpleGrid>
    );
}

export default function HomeClient({
    initialPosts,
    initialTrending,
    initialFeatured,
    initialSagas,
}: {
    initialPosts: Post[];
    initialTrending: Game[];
    initialFeatured: Game[];
    initialSagas: Saga[];
}) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const posts = initialPosts;
    const { conditionParam, sellerScopeParam, ready } = useApp();

    /* El filtro Usados/Nuevos/Todos del header (AppContext) también debe
       acotar Destacados y Populares: se re-piden al cambiar `condition`,
       igual que hace SearchClient. En 'all' se vuelve a los datos SSR
       iniciales en vez de re-pedir lo mismo. `condition` arranca en 'all'
       en el primer render y recién después se hidrata desde localStorage
       (AppContext), así que este efecto corre de nuevo apenas eso ocurre. */
    const [trending, setTrending] = useState<Game[]>(initialTrending);
    const [featured, setFeatured] = useState<Game[]>(initialFeatured);
    /* `filtering` alimenta los skeletons de Destacados/Populares mientras el
       refetch por condición está en vuelo — sin él, la UI mostraba los datos
       viejos sin ninguna señal y el toggle se sentía trabado. */
    const [filtering, setFiltering] = useState(false);
    /* Respuestas ya vistas en esta sesión, por combinación de filtros globales:
       alternar de vuelta a una ya visitada es instantáneo, sin red. Staleness de
       segundos, aceptable — el backend cachea estos endpoints de todos modos.
       La clave es compuesta porque los filtros globales ya son dos. */
    const filterCache = useRef(new Map<string, { trending: Game[]; featured: Game[] }>());
    useEffect(() => {
        /* Sin las preferencias leídas, `condition`/`sellerScopeParam` valen su
           default optimista: pedir con ellos gastaría un fetch que hay que
           repetir, y peor, dejaría pintados los datos sin filtrar. */
        if (!ready) return;
        /* El SSR se renderiza sin filtros (página cacheada y compartida), así
           que solo sirve cuando NINGUNO está activo. */
        /* Sobre el parámetro DERIVADO, no sobre `condition`: con formato
           "físico" y estado "todos" la condición sigue valiendo 'all' pero el
           filtro sí acota, y reusar el SSR dejaba la home sin filtrar sin que
           ninguna petición lo delatara. */
        if (!conditionParam && !sellerScopeParam) {
            setTrending(initialTrending);
            setFeatured(initialFeatured);
            setFiltering(false);
            return;
        }
        const cacheKey = `${conditionParam ?? 'all'}:${sellerScopeParam ?? 'all'}`;
        const cached = filterCache.current.get(cacheKey);
        if (cached) {
            setTrending(cached.trending);
            setFeatured(cached.featured);
            setFiltering(false);
            return;
        }
        const controller = new AbortController();
        /* Distingue "esta corrida quedó obsoleta" de "la petición falló". Antes
           se deducía del nombre del error (`AbortError`), asumiendo que todo
           abort venía del cleanup de abajo — pero un abort de la red o de la
           navegación entra por la misma rama, y ahí nadie repone `filtering`:
           quedaba en `true` para siempre, con el skeleton tapando Destacados y
           la grilla reemplazada por su esqueleto. El flag lo decide el cleanup,
           que es quien de verdad lo sabe. */
        let superseded = false;
        setFiltering(true);
        const query = {
            condition: conditionParam,
            seller_scope: sellerScopeParam,
        };
        Promise.all([
            getTrendingGames({ ...query, signal: controller.signal }),
            getFeaturedGames({ ...query, signal: controller.signal }),
        ])
            .then(([t, f]) => {
                if (superseded) return;
                filterCache.current.set(cacheKey, { trending: t.results, featured: f.results });
                /* startTransition marca el swap de contenido como no urgente:
                   la animación del SegmentedControl y el resto de la UI no
                   quedan bloqueados por el re-render del carrusel + grilla. */
                startTransition(() => {
                    setTrending(t.results);
                    setFeatured(f.results);
                    setFiltering(false);
                });
            })
            .catch(() => {
                /* Si la corrida fue reemplazada, la nueva ya dejó el estado
                   correcto y tocarlo acá lo pisaría. */
                if (superseded) return;
                setTrending([]);
                setFeatured([]);
                setFiltering(false);
            });
        return () => {
            superseded = true;
            controller.abort();
        };
    }, [ready, conditionParam, sellerScopeParam, initialTrending, initialFeatured]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
    };

    return (
        <>
            {/* ══════ HERO ══════ */}
            <Box
                py={{ base: 60, md: 100 }}
                pos="relative"
                style={{ overflow: 'hidden' }}
            >
                {/* Decorative blobs */}
                <Box
                    pos="absolute"
                    top={-80}
                    right={-80}
                    w={380}
                    h={380}
                    style={{
                        borderRadius: '50%',
                        background: decorative.heroBlobRed,
                        filter: 'blur(60px)',
                        pointerEvents: 'none',
                    }}
                />
                <Box
                    pos="absolute"
                    bottom={-80}
                    left={-80}
                    w={320}
                    h={320}
                    style={{
                        borderRadius: '50%',
                        background: decorative.heroBlobBlue,
                        filter: 'blur(60px)',
                        pointerEvents: 'none',
                    }}
                />

                <Container size="lg" pos="relative" style={{ zIndex: 1, textAlign: 'center' }}>
                    <Badge
                        color="primaryRed"
                        variant="light"
                        size="lg"
                        leftSection={<IconFlame size={14} />}
                        mb="lg"
                    >
                        Ya estamos aquí!!
                    </Badge>

                    <Title order={1} fz={{ base: 32, md: 52 }} fw={800} lh={1.15} mb="md">
                        Encuentra tu próximo juego{' '}
                        <br style={{ display: 'none' }} className="hiddenMobile" />
                        <Text component="span" className="gradient-text" inherit>
                            al mejor precio
                        </Text>
                    </Title>

                    <Text fz={{ base: 'md', md: 'xl' }} c="dimmed" maw={600} mx="auto" mb="xl">
                        Compara precios en tiempo real entre decenas de tiendas chilenas. Ahorra dinero y juega
                        más.
                    </Text>

                    {/* Search bar */}
                    <Box maw={680} mx="auto" pos="relative">
                        <Box
                            pos="absolute"
                            style={{
                                inset: -4,
                                borderRadius: 'var(--mantine-radius-xl)',
                                background: 'linear-gradient(to right, var(--mantine-color-primaryRed-5), var(--mantine-color-orange-5))',
                                filter: 'blur(16px)',
                                opacity: 0.2,
                                transition: 'opacity 0.5s',
                                pointerEvents: 'none',
                            }}
                        />
                        <form onSubmit={handleSearch}>
                            <Group
                                gap={0}
                                pos="relative"
                                p={6}
                                style={{
                                    borderRadius: 'var(--mantine-radius-xl)',
                                    background: `light-dark(${surfaces.light.heroSearchBar}, ${surfaces.dark.heroSearchBar})`,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                    border: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))',
                                }}
                            >
                                <TextInput
                                    placeholder="Ej: Elden Ring, FIFA 24, Zelda..."
                                    leftSection={<IconSearch size={22} style={{ color: '#9ca3af' }} />}
                                    value={query}
                                    onChange={(e) => setQuery(e.currentTarget.value)}
                                    size="lg"
                                    radius="xl"
                                    styles={{
                                        input: { border: 'none', background: 'transparent', fontSize: 16 },
                                        root: { flex: 1 },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    size="lg"
                                    radius="xl"
                                    color="primaryRed"
                                    px="xl"
                                    style={{ boxShadow: decorative.primaryButtonShadow }}
                                >
                                    Buscar
                                </Button>
                            </Group>
                        </form>
                    </Box>

                </Container>
            </Box>

            {/* ══════ SAGAS BANNER ══════ */}
            {/* Sin datos aún (el admin no cargó ninguna saga como destacada):
                se omite en vez de mostrar una sección vacía. */}
            {initialSagas.length > 0 && (
                <Box
                    py="xl"
                    style={{ borderTop: '1px solid var(--mantine-color-default-border)', borderBottom: '1px solid var(--mantine-color-default-border)', background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTint})` }}
                >
                    <Container size="lg">
                        <Text fz="sm" fw={700} tt="uppercase" ta="center" c="dimmed" mb="xl" style={{ letterSpacing: 3 }}>
                            <Link href="/sagas" className="saga-banner-link">
                                Explora tus sagas favoritas
                            </Link>
                        </Text>
                        <Group justify="center" gap={60} align="center" mt="xl">
                            {initialSagas.map((s) => (
                                <Anchor
                                    key={s.slug}
                                    component={Link}
                                    href={`/saga/${s.slug}`}
                                    style={{
                                        display: 'block',
                                        transition: 'all 0.3s ease',
                                        filter: 'grayscale(1)',
                                        opacity: 0.6,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                        e.currentTarget.style.filter = 'grayscale(0)';
                                        e.currentTarget.style.opacity = '1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.filter = 'grayscale(1)';
                                        e.currentTarget.style.opacity = '0.6';
                                    }}
                                >
                                    <SagaLogo saga={s} />
                                </Anchor>
                            ))}
                        </Group>
                    </Container>
                </Box>
            )}

            {/* ══════ JUEGOS DESTACADOS ══════ */}
            {(featured.length > 0 || filtering) && (
                <Box py={60} style={{ background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTint})` }}>
                    <Container size="lg">
                        <Box mb="xl">
                            <Title order={2} fz={{ base: 24, md: 30 }} fw={700}>
                                Juegos Destacados
                            </Title>
                            <Text c="dimmed" mt={6}>
                                Selección del equipo PIO.
                            </Text>
                        </Box>

                        <Box data-prefs-dependent>
                            <FeaturedGamesCarousel games={featured} loading={filtering} />
                        </Box>
                    </Container>
                </Box>
            )}

            {/* ══════ POPULARES ESTA SEMANA ══════ */}
            {(trending.length > 0 || filtering) && (
                /* Cierra con 20 y no con los 60 del resto: sumado a la apertura
                   de "Noticias" daban 120 px de hueco, el doble que entre
                   cualquier otro par de secciones. */
                <Box pt={60} pb={20}>
                    <Container size="lg">
                        <Group justify="space-between" align="flex-end" mb="xl">
                            <Box>
                                <Title order={2} fz={{ base: 24, md: 30 }} fw={700}>
                                    Populares esta semana
                                </Title>
                                <Text c="dimmed" mt={6}>
                                    Los juegos con más movimiento en los últimos 7 días.
                                </Text>
                            </Box>
                            <Anchor
                                component={Link}
                                href="/search"
                                c="var(--mantine-color-primaryRed-5)"
                                fw={600}
                                fz="sm"
                                underline="never"
                            >
                                Ver todos los juegos <IconArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                            </Anchor>
                        </Group>

                        {/* `data-prefs-dependent`: el HTML del SSR viene sin
                            filtrar (esta página es ISR y su caché se comparte),
                            así que a quien tenga un filtro apagado el CSS se lo
                            mantiene tapado hasta que llega el refetch. Ver
                            PrefsScript y globals.css. */}
                        <Box data-prefs-dependent>
                            {filtering ? (
                                <TrendingGridSkeleton />
                            ) : (
                                <SimpleGrid cols={{ base: 2, xs: 2, md: 4 }} spacing={{ base: 'xs', xs: 'lg' }}>
                                    {trending.slice(0, 8).map((g, i) => (
                                        <GameCard key={g.id} game={g} priority={i < 4} />
                                    ))}
                                </SimpleGrid>
                            )}
                        </Box>
                    </Container>
                </Box>
            )}

            {/* ══════ NOTICIAS Y COMUNIDAD ══════ */}
            <Box py={60}>
                <Container size="lg">
                    <Group justify="space-between" align="flex-end" mb="xl">
                        <Box>
                            <Title order={2} fz={{ base: 24, md: 30 }} fw={700}>
                                Noticias y Comunidad
                            </Title>
                            <Text c="dimmed" mt={6}>
                                Mantente al día con lo último de Play in One y el mundo gaming.
                            </Text>
                        </Box>
                        <Anchor
                            component={Link}
                            href="/blog"
                            c="var(--mantine-color-primaryRed-5)"
                            fw={600}
                            fz="sm"
                            underline="never"
                        >
                            Ver todas las noticias <IconArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                        </Anchor>
                    </Group>

                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                        {posts.slice(0, 3).map((n) => (
                            <Card
                                key={n.id}
                                component="a"
                                href={`/blog/${n.id}`}
                                withBorder
                                shadow="sm"
                                radius="lg"
                                p={0}
                                style={{ overflow: 'hidden', transition: 'box-shadow 0.3s', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                                onClick={() => trackEvent({ event_type: 'post_click', post: n.id })}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}
                            >
                                {/* Placeholder image area */}
                                <Box
                                    h={{ base: 130, md: 180 }}
                                    style={{
                                        background: 'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    {n.image ? (
                                        <img src={n.image} alt={n.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <IconDeviceGamepad size={48} color="var(--mantine-color-dimmed)" />
                                    )}
                                </Box>
                                <Box p={{ base: 'md', md: 'lg' }}>
                                    <Text fz={{ base: 10, md: 'xs' }} fw={700} c="var(--mantine-color-primaryRed-5)" tt="uppercase" mb={{ base: 4, md: 6 }} style={{ letterSpacing: 1 }}>
                                        {n.category}
                                    </Text>
                                    <Text fw={700} fz={{ base: 'sm', md: 'lg' }} mb={{ base: 4, md: 6 }} lineClamp={2}>{n.title}</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} c="dimmed" lineClamp={3}>{n.description}</Text>
                                </Box>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* ══════ PUBLICIDAD ══════ */}
            {/* Sin prop `allowed`: la home es ISR y su HTML se comparte entre
                todos los visitantes, así que el país lo resuelve el navegador
                contra /api/geo. Ver AdSlot. */}
            <AdSlot slot={AD_SLOT_HOME_FOOTER} />

            {/* ══════ EXPLORAR POR PLATAFORMA ══════ */}
            <Box py={60} style={{ background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTint})` }}>
                <Container size="lg">
                    <Title order={2} fz={24} fw={700} mb="xl">
                        Explorar por Plataforma
                    </Title>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        {PLATFORM_GROUPS.filter((group) => group.brand !== 'PC').map((group) => {
                            const Icon = group.icon;
                            // Una consola sola tiene landing indexable; un grupo de varias
                            // solo existe como filtro del buscador.
                            const href = group.featuredSlugs.length === 1
                                ? `/juegos/${group.featuredSlugs[0]}`
                                : `/search?platform=${group.featuredSlugs.join(',')}`;
                            return (
                                <Anchor key={group.label} href={href} underline="never">
                                    <Card
                                        withBorder
                                        shadow="sm"
                                        radius="lg"
                                        py="xl"
                                        style={{
                                            textAlign: 'center',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            cursor: 'pointer',
                                            backgroundColor: group.color,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = '';
                                            e.currentTarget.style.boxShadow = '';
                                        }}
                                    >
                                        <Stack align="center" gap="xs">
                                            <Icon size={40} color={'white'} />
                                            <Text fw={700} fz="sm" c="white">{group.label}</Text>
                                        </Stack>
                                    </Card>
                                </Anchor>
                            );
                        })}
                    </SimpleGrid>
                </Container>
            </Box>
        </>
    );
}
