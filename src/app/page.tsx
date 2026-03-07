'use client';

import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import type { ComponentType } from 'react';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
    useMantineColorScheme,
} from '@mantine/core';
import {
    IconSearch,
    IconFlame,
    IconTag,
    IconArrowRight,
    IconDeviceGamepad,
    IconDeviceGamepad2,
    IconDeviceDesktop,
    IconDeviceNintendo,
} from '@tabler/icons-react';
import { getGames, getPosts, getPlatforms } from '@/lib/api';
import type { Game, Post, Platform } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/utils';
import GameCard from '@/components/GameCard';

/* ── Sagas Favoritas ── */
const SAGAS = [
    { name: 'Pokémon', query: 'pokemon', logo: '/logos/pokemon.svg' },
    { name: 'Minecraft', query: 'minecraft', logo: '/logos/minecraft.svg' },
    { name: 'Grand Theft Auto', query: 'gta', logo: '/logos/gta.svg' },
    { name: 'Resident Evil', query: 'resident evil', logo: '/logos/resident-evil.svg' },
    { name: 'The Legend of Zelda', query: 'zelda', logo: '/logos/zelda.svg' },
];

/* ── Mapa de iconos por slug de plataforma ── */
const PLATFORM_ICON_MAP: Record<string, ComponentType<{ size?: number; color?: string }>> = {
    ps3: FaPlaystation,
    ps4: FaPlaystation,
    ps5: FaPlaystation,
    xbox: FaXbox,
    switch: BsNintendoSwitch,
    switch2: BsNintendoSwitch,
    pc: IconDeviceDesktop,
    wii: IconDeviceNintendo,
    nds: IconDeviceGamepad2,
    '3ds': IconDeviceGamepad2,
    wiiu: IconDeviceNintendo,
};

export default function HomePage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [games, setGames] = useState<Game[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        getGames({ page: 1 })
            .then((res) => setGames(res.results))
            .catch(() => { });
        getPosts({ page: 1, ordering: '-published_date' })
            .then((res) => setPosts(res.results))
            .catch(() => { });
        getPlatforms()
            .then((res) => setPlatforms(res.results))
            .catch(() => { });
    }, []);

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
                        background: 'rgba(230,57,70,0.1)',
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
                        background: 'rgba(59,130,246,0.1)',
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
                        Comparador #1 en Chile
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
                                    background: isDark ? 'var(--mantine-color-dark-6)' : '#fff',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                    border: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)'}`,
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
                style={{ borderTop: '1px solid var(--mantine-color-default-border)', borderBottom: '1px solid var(--mantine-color-default-border)' }}
                bg={isDark ? 'rgba(0,0,0,0.2)' : 'var(--mantine-color-gray-0)'}
            >
                <Container size="lg">
                    <Text fz="sm" fw={700} tt="uppercase" ta="center" c="dimmed" mb="xl" style={{ letterSpacing: 3 }}>
                        Explora tus sagas favoritas
                    </Text>
                    <Group justify="center" gap={60} align="center" mt="xl">
                        {SAGAS.map((s) => (
                            <Anchor
                                key={s.name}
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

            {/* ══════ OFERTAS DESTACADAS ══════ */}
            <Box py={60}>
                <Container size="lg">
                    <Group justify="space-between" align="flex-end" mb="xl">
                        <Box>
                            <Title order={2} fz={{ base: 24, md: 30 }} fw={700}>
                                <Group gap={8} component="span">
                                    <IconTag size={28} color="var(--mantine-color-primaryRed-5)" />
                                    Ofertas Destacadas
                                </Group>
                            </Title>
                            <Text c="dimmed" mt={6}>
                                Las mejores bajadas de precio de las últimas 24 horas.
                            </Text>
                        </Box>
                        <Anchor
                            href="/search"
                            c="var(--mantine-color-primaryRed-5)"
                            fw={600}
                            fz="sm"
                            visibleFrom="sm"
                            underline="never"
                        >
                            Ver todas las ofertas <IconArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                        </Anchor>
                    </Group>

                    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="lg">
                        {games.slice(0, 8).map((g) => {
                            const best = g.products?.[0] ?? null;
                            return <GameCard key={g.id} game={g} bestProduct={best} />;
                        })}
                    </SimpleGrid>

                    {/* Mobile CTA */}
                    <Box ta="center" mt="xl" hiddenFrom="sm">
                        <Button
                            component="a"
                            href="/search"
                            variant="outline"
                            color="primaryRed"
                            radius="xl"
                            rightSection={<IconArrowRight size={16} />}
                        >
                            Ver todas las ofertas
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* ══════ EXPLORAR POR PLATAFORMA ══════ */}
            <Box py={60} bg={isDark ? 'rgba(0,0,0,0.2)' : 'var(--mantine-color-gray-0)'}>
                <Container size="lg">
                    <Title order={2} fz={24} fw={700} mb="xl">
                        Explorar por Plataforma
                    </Title>

                    <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
                        {platforms.map((p) => {
                            const Icon = PLATFORM_ICON_MAP[p.name] || IconDeviceGamepad2;
                            const pColor = PLATFORM_COLORS[p.name]?.cssVar || 'var(--mantine-color-gray-filled)';
                            return (
                                <Anchor key={p.slug} href={`/search?platform=${p.slug}`} underline="never">
                                    <Card
                                        withBorder
                                        shadow="sm"
                                        radius="lg"
                                        py="xl"
                                        style={{
                                            textAlign: 'center',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            cursor: 'pointer',
                                            backgroundColor: pColor,
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
                                            <Text fw={700} fz="sm" c="white">{p.display_name}</Text>
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
                                    bg={isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-2)'}
                                    style={{
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
