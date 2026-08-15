'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';
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
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import {
    IconSearch,
    IconFlame,
    IconArrowRight,
    IconDeviceGamepad,
} from '@tabler/icons-react';
import type { Post, Game } from '@/lib/types';
import { PLATFORM_GROUPS } from '@/lib/platformGroups';
import { surfaces, decorative } from '@/lib/colors';
import { getTrendingGames, getFeaturedGames } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import GameCard from '@/components/GameCard';
import FeaturedGameCard from '@/components/FeaturedGameCard';

/* ── Sagas Favoritas ── */
const SAGAS = [
    { name: 'Pokémon', query: 'pokemon', logo: '/logos/pokemon.svg' },
    { name: 'Minecraft', query: 'minecraft', logo: '/logos/minecraft.svg' },
    { name: 'Grand Theft Auto', query: 'gta', logo: '/logos/gta.svg' },
    { name: 'Resident Evil', query: 'resident evil', logo: '/logos/resident-evil.png' },
    { name: 'The Legend of Zelda', query: 'zelda', logo: '/logos/zelda.png' },
];

export default function HomeClient({
    initialPosts,
    initialTrending,
    initialFeatured,
}: {
    initialPosts: Post[];
    initialTrending: Game[];
    initialFeatured: Game[];
}) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const posts = initialPosts;
    const { condition } = useApp();

    /* Los carruseles (Embla) miden su contenedor y recién ahí centran la
       tarjeta activa; hasta entonces se ven alineados a la izquierda. Se
       ocultan con un fade breve para no mostrar ese salto. */
    const [carouselsReady, setCarouselsReady] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setCarouselsReady(true)));
        return () => cancelAnimationFrame(id);
    }, []);

    /* Efecto "coverflow": solo la tarjeta centrada del carrusel de Destacados
       se ve horizontal completa; las laterales se comprimen a la carátula.
       Siempre guarda el índice REAL dentro de `featured` (nunca el índice
       de Embla, que incluye los clones de abajo). */
    const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);

    /* @mantine/carousel expone una prop `speed`, pero es un remanente de la
       API de Embla v7 (donde era un multiplicador de fricción); el paquete
       instalado es embla-carousel v8, que renombró esa opción a `duration`
       — `speed` llega a Embla como una key que no reconoce y no hace nada.
       Aun corrigiéndolo con `duration` real, Embla converge en ~100-150ms
       para saltar a la tarjeta adyacente sin importar el valor (afecta más
       a distancias largas), mucho más rápido que la animación de expandir
       la tarjeta (~0.7s) — por eso se sentía "sin transición".
       Solución: una transición CSS sobre el transform del track, mostrando
       recién ahí el movimiento a la misma velocidad que la tarjeta. Debe
       activarse SOLO al usar las flechas, nunca durante el arrastre (si el
       track tuviera esta transición todo el tiempo, el drag se vería con
       lag, siguiendo al mouse con retraso, en vez de responder en vivo). */
    const [featuredTransitioning, setFeaturedTransitioning] = useState(false);
    const featuredTransitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerFeaturedTransition = () => {
        setFeaturedTransitioning(true);
        if (featuredTransitionTimeout.current) clearTimeout(featuredTransitionTimeout.current);
        featuredTransitionTimeout.current = setTimeout(() => setFeaturedTransitioning(false), 800);
    };

    /* Loop manual: en vez de dejar que Embla clone los extremos internamente
       (`loop`), se agregan a mano copias de los últimos y primeros juegos
       en los bordes (`paddedFeatured`, más abajo). Cruzar hacia una copia es
       una transición normal — se anima igual que cualquier otro click. Una
       vez asentado sobre la copia, se reubica en silencio (sin animación)
       sobre el juego real equivalente, que es visualmente idéntico, así que
       el salto es imperceptible. Intentar animar el salto interno que hace
       `loop` por su cuenta (probado en una versión anterior) se veía como
       si el carrusel entero "se devolviera" hasta el principio.
       Se clonan 2 juegos de cada lado (no solo 1): con un click rápido y
       sucesivo, un solo clon de colchón no alcanza a corregirse antes de
       que el siguiente click intente cruzar OTRA VEZ el límite — con
       `loop={false}` eso deja al carrusel sin más adónde ir (atascado). Dos
       clones dan margen para un par de clicks rápidos seguidos. */
    const FEATURED_CLONE_COUNT = 2;
    const emblaFeaturedApi = useRef<EmblaCarouselType | null>(null);
    const featuredCorrectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleFeaturedEmblaApi = (emblaApi: EmblaCarouselType) => {
        /* Mientras el track hace la transición CSS de arriba, la tarjeta
           activa también está cambiando de ancho (comprimida ↔ expandida) —
           Embla observa el tamaño de las tarjetas por defecto (`watchResize`)
           y recalcula la geometría del carrusel en pleno vuelo, lo que se
           veía como un freno a mitad de camino seguido de un salto. El
           carrusel tiene un número fijo de tarjetas con `slideSize` fijo
           por breakpoint, así que no necesita ese watcher. */
        emblaApi.reInit({ watchResize: false });
        emblaFeaturedApi.current = emblaApi;
    };
    const handleFeaturedSlideChange = (paddedIndex: number) => {
        /* Con 0 o 1 juego destacado no hay clones (`paddedFeatured` es
           `featured` tal cual, ver más abajo) — el índice de Embla ya es el
           real, sin traducción ni corrección. */
        if (featured.length <= 1) {
            setActiveFeaturedIndex(paddedIndex);
            return;
        }
        const n = featured.length;
        const isCloneBefore = paddedIndex < FEATURED_CLONE_COUNT;
        const isCloneAfter = paddedIndex >= FEATURED_CLONE_COUNT + n;
        const realIndex = isCloneBefore
            ? (n - FEATURED_CLONE_COUNT + paddedIndex) % n
            : isCloneAfter
                ? paddedIndex - (FEATURED_CLONE_COUNT + n)
                : paddedIndex - FEATURED_CLONE_COUNT;
        setActiveFeaturedIndex(realIndex);

        /* Cancela cualquier corrección pendiente de un click anterior: si el
           usuario hizo varios clicks rápidos seguidos, solo debe sobrevivir
           la corrección hacia la posición donde terminó asentado, no una
           corrección vieja apuntando a una posición ya superada. */
        if (featuredCorrectionTimeout.current) clearTimeout(featuredCorrectionTimeout.current);
        if (isCloneBefore || isCloneAfter) {
            /* Espera un poco más que el apagado de la transición CSS (800ms)
               para no arriesgarse a que el salto silencioso ocurra mientras
               esa transición sigue activa, lo que lo animaría. */
            featuredCorrectionTimeout.current = setTimeout(() => {
                emblaFeaturedApi.current?.scrollTo(FEATURED_CLONE_COUNT + realIndex, true);
            }, 850);
        }
    };
    useEffect(() => () => {
        if (featuredTransitionTimeout.current) clearTimeout(featuredTransitionTimeout.current);
        if (featuredCorrectionTimeout.current) clearTimeout(featuredCorrectionTimeout.current);
    }, []);

    /* El filtro Usados/Nuevos/Todos del header (AppContext) también debe
       acotar Destacados y Populares: se re-piden al cambiar `condition`,
       igual que hace SearchClient. En 'all' se vuelve a los datos SSR
       iniciales en vez de re-pedir lo mismo. `condition` arranca en 'all'
       en el primer render y recién después se hidrata desde localStorage
       (AppContext), así que este efecto corre de nuevo apenas eso ocurre. */
    const [trending, setTrending] = useState<Game[]>(initialTrending);
    const [featured, setFeatured] = useState<Game[]>(initialFeatured);
    useEffect(() => {
        if (condition === 'all') {
            setTrending(initialTrending);
            setFeatured(initialFeatured);
            return;
        }
        const controller = new AbortController();
        Promise.all([
            getTrendingGames({ condition, signal: controller.signal }),
            getFeaturedGames({ condition, signal: controller.signal }),
        ])
            .then(([t, f]) => {
                setTrending(t.results);
                setFeatured(f.results);
            })
            .catch((err) => { if (err?.name !== 'AbortError') { setTrending([]); setFeatured([]); } });
        return () => controller.abort();
    }, [condition, initialTrending, initialFeatured]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
    };

    /* Clones a mano en los bordes para el loop manual del carrusel de
       Destacados (ver comentario junto a `handleFeaturedSlideChange`). Usa
       módulo para no romperse si hay menos juegos que clones deseados. */
    const paddedFeatured =
        featured.length > 1
            ? [
                ...Array.from(
                    { length: FEATURED_CLONE_COUNT },
                    (_, i) => featured[(featured.length - FEATURED_CLONE_COUNT + i + featured.length) % featured.length],
                ),
                ...featured,
                ...Array.from({ length: FEATURED_CLONE_COUNT }, (_, i) => featured[i % featured.length]),
            ]
            : featured;

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
                                    style={{ boxShadow: '0 4px 14px rgba(230,57,70,0.25)' }}
                                >
                                    Buscar
                                </Button>
                            </Group>
                        </form>
                    </Box>

                </Container>
            </Box>

            {/* ══════ SAGAS BANNER ══════ */}
            <Box
                py="xl"
                style={{ borderTop: '1px solid var(--mantine-color-default-border)', borderBottom: '1px solid var(--mantine-color-default-border)', background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTint})` }}
            >
                <Container size="lg">
                    <Text fz="sm" fw={700} tt="uppercase" ta="center" c="dimmed" mb="xl" style={{ letterSpacing: 3 }}>
                        Explora tus sagas favoritas
                    </Text>
                    <Group justify="center" gap={60} align="center" mt="xl">
                        {SAGAS.map((s) => (
                            <Anchor
                                key={s.name}
                                component={Link}
                                href={`/search?q=${encodeURIComponent(s.query)}`}
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
                                <img
                                    src={s.logo}
                                    alt={`Logo de ${s.name}`}
                                    style={{
                                        height: 60,
                                        width: 'auto',
                                        maxWidth: 160,
                                        objectFit: 'contain',
                                        display: 'block'
                                    }}
                                />
                            </Anchor>
                        ))}
                    </Group>
                </Container>
            </Box>

            {/* ══════ JUEGOS DESTACADOS ══════ */}
            {featured.length > 0 && (
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

                        <Box pos="relative" style={{ opacity: carouselsReady ? 1 : 0, transition: 'opacity 0.25s ease' }}>
                            <Carousel
                                slideSize={{ base: '82%', md: '58%' }}
                                slideGap="70px"
                                align="center"
                                loop={false}
                                initialSlide={featured.length > 1 ? FEATURED_CLONE_COUNT : 0}
                                withIndicators={false}
                                controlsOffset="-20px"
                                getEmblaApi={handleFeaturedEmblaApi}
                                onSlideChange={handleFeaturedSlideChange}
                                previousControlProps={{ onClick: triggerFeaturedTransition }}
                                nextControlProps={{ onClick: triggerFeaturedTransition }}
                                styles={{
                                    container: {
                                        paddingTop: 12,
                                        paddingBottom: 8,
                                        transition: featuredTransitioning ? 'transform 0.7s ease' : 'none',
                                    },
                                    controls: { zIndex: 3 },
                                }}
                            >
                                {paddedFeatured.map((g, paddedIndex) => {
                                    /* `paddedIndex` recorre los clones también (los primeros y
                                       últimos `FEATURED_CLONE_COUNT`); se traduce al índice REAL
                                       dentro de `featured` para decidir si esta tarjeta es la activa
                                       y su posición relativa — un clon "hereda" el estado del juego
                                       real que representa. Misma fórmula que `handleFeaturedSlideChange`. */
                                    const isCloneBefore = paddedIndex < FEATURED_CLONE_COUNT;
                                    const isCloneAfter = paddedIndex >= FEATURED_CLONE_COUNT + featured.length;
                                    const realIndex = isCloneBefore
                                        ? (featured.length - FEATURED_CLONE_COUNT + paddedIndex) % featured.length
                                        : isCloneAfter
                                            ? paddedIndex - (FEATURED_CLONE_COUNT + featured.length)
                                            : paddedIndex - FEATURED_CLONE_COUNT;
                                    return (
                                        <Carousel.Slide key={`${g.id}-${paddedIndex}`}>
                                            <FeaturedGameCard
                                                game={g}
                                                isActive={realIndex === activeFeaturedIndex}
                                                /* Distancia circular (no un simple index < active): con loop,
                                                   comparar índices lineales clasifica mal a la tarjeta que da
                                                   la vuelta (ej. si la activa es la 0, la última técnicamente
                                                   tiene índice mayor pero visualmente está "antes", a la
                                                   izquierda). */
                                                side={
                                                    realIndex === activeFeaturedIndex
                                                        ? 'active'
                                                        : (realIndex - activeFeaturedIndex + featured.length) % featured.length <=
                                                            featured.length / 2
                                                            ? 'after'
                                                            : 'before'
                                                }
                                            />
                                        </Carousel.Slide>
                                    );
                                })}
                            </Carousel>
                        </Box>
                    </Container>
                </Box>
            )}

            {/* ══════ POPULARES ESTA SEMANA ══════ */}
            {trending.length > 0 && (
                <Box py={60}>
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

                        <SimpleGrid cols={{ base: 2, xs: 2, md: 4 }} spacing={{ base: 'xs', xs: 'lg' }}>
                            {trending.slice(0, 8).map((g) => (
                                <GameCard key={g.id} game={g} />
                            ))}
                        </SimpleGrid>
                    </Container>
                </Box>
            )}

            {/* ══════ EXPLORAR POR PLATAFORMA ══════ */}
            <Box py={60} style={{ background: `light-dark(var(--mantine-color-gray-0), ${surfaces.altSectionTint})` }}>
                <Container size="lg">
                    <Title order={2} fz={24} fw={700} mb="xl">
                        Explorar por Plataforma
                    </Title>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        {PLATFORM_GROUPS.map((group) => {
                            const Icon = group.icon;
                            const href = `/search?platform=${group.options.map((o) => o.slug).join(',')}`;
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
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}
                            >
                                {/* Placeholder image area */}
                                <Box
                                    h={180}
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
                                <Box p="lg">
                                    <Text fz="xs" fw={700} c="var(--mantine-color-primaryRed-5)" tt="uppercase" mb={6} style={{ letterSpacing: 1 }}>
                                        {n.category}
                                    </Text>
                                    <Text fw={700} fz="lg" mb={6} lineClamp={2}>{n.title}</Text>
                                    <Text fz="sm" c="dimmed" lineClamp={3}>{n.description}</Text>
                                </Box>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>
        </>
    );
}
