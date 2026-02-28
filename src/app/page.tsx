'use client';

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
import { getGames } from '@/lib/api';
import type { Game } from '@/lib/types';
import GameCard from '@/components/GameCard';

/* ── Tiendas monitoreadas ── */
const STORES = [
    { name: 'Falabella', prefix: 'F', color: '#16A34A' },
    { name: 'WePlay', prefix: null, color: '#2563EB' },
    { name: 'Microplay', prefix: 'M', color: '#DC2626' },
    { name: 'TodoJuegos', prefix: null, color: '#F97316' },
    { name: 'Zmart', prefix: 'Z', color: '#7C3AED' },
    { name: 'Paris', prefix: null, color: '#6B7280' },
];

/* ── Plataformas ── */
const PLATFORMS = [
    { label: 'PlayStation', slug: 'ps5', icon: IconDeviceGamepad, color: '#2563EB' },
    { label: 'Xbox', slug: 'xbox', icon: IconDeviceGamepad2, color: '#16A34A' },
    { label: 'Nintendo', slug: 'switch', icon: IconDeviceNintendo, color: '#DC2626' },
    { label: 'PC / Steam', slug: 'pc', icon: IconDeviceDesktop, color: '#6B7280' },
];

export default function HomePage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [games, setGames] = useState<Game[]>([]);
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        getGames({ page: 1 })
            .then((res) => setGames(res.results))
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

            {/* ══════ TIENDAS BANNER ══════ */}
            <Box
                py="lg"
                style={{ borderTop: '1px solid var(--mantine-color-default-border)', borderBottom: '1px solid var(--mantine-color-default-border)' }}
                bg={isDark ? 'rgba(0,0,0,0.2)' : 'var(--mantine-color-gray-0)'}
            >
                <Container size="lg">
                    <Text fz="xs" fw={600} tt="uppercase" ta="center" c="dimmed" mb="md" style={{ letterSpacing: 2 }}>
                        Monitoreamos tus tiendas favoritas
                    </Text>
                    <Group justify="center" gap={{ base: 'lg', md: 'xl' }} style={{ opacity: 0.6, filter: 'grayscale(1)' }}>
                        {STORES.map((s) => (
                            <Group key={s.name} gap={6}>
                                {s.prefix && (
                                    <Box
                                        w={28}
                                        h={28}
                                        style={{
                                            borderRadius: 4,
                                            background: s.color,
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {s.prefix}
                                    </Box>
                                )}
                                <Text fw={700} fz="lg">
                                    {s.prefix ? s.name : (
                                        <>
                                            {s.name === 'TodoJuegos' ? (
                                                <>Todo<Text span c={s.color}>Juegos</Text></>
                                            ) : s.name === 'WePlay' ? (
                                                <Text span c={s.color}>{s.name}</Text>
                                            ) : s.name}
                                        </>
                                    )}
                                </Text>
                            </Group>
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

                    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                        {PLATFORMS.map((p) => {
                            const Icon = p.icon;
                            return (
                                <Anchor key={p.slug} href={`/platform/${p.slug}`} underline="never">
                                    <Card
                                        withBorder
                                        shadow="sm"
                                        radius="lg"
                                        py="xl"
                                        style={{
                                            textAlign: 'center',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            cursor: 'pointer',
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
                                            <Icon size={40} color={p.color} />
                                            <Text fw={700}>{p.label}</Text>
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
                            href="#"
                            c="var(--mantine-color-primaryRed-5)"
                            fw={600}
                            fz="sm"
                            underline="never"
                        >
                            Ver todas las noticias <IconArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                        </Anchor>
                    </Group>

                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                        {[
                            {
                                cat: 'Actualización',
                                title: 'Nuevas tiendas integradas',
                                desc: 'Hemos añadido 5 nuevas tiendas locales para que encuentres siempre el mejor precio disponible en Chile.',
                            },
                            {
                                cat: 'Comunidad',
                                title: 'Torneo de la comunidad',
                                desc: 'Participa en nuestro próximo torneo de eSports y gana increíbles premios y Gift Cards.',
                            },
                            {
                                cat: 'Gaming',
                                title: 'Lo más esperado de 2026',
                                desc: 'Revisamos los títulos que llegarán este año y cómo prepararte para conseguirlos al mejor precio.',
                            },
                        ].map((n) => (
                            <Card
                                key={n.title}
                                withBorder
                                shadow="sm"
                                radius="lg"
                                p={0}
                                style={{ overflow: 'hidden', transition: 'box-shadow 0.3s', cursor: 'pointer' }}
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
                                    }}
                                >
                                    <IconDeviceGamepad size={48} color="var(--mantine-color-dimmed)" />
                                </Box>
                                <Box p="lg">
                                    <Text fz="xs" fw={700} c="var(--mantine-color-primaryRed-5)" tt="uppercase" mb={6} style={{ letterSpacing: 1 }}>
                                        {n.cat}
                                    </Text>
                                    <Text fw={700} fz="lg" mb={6}>{n.title}</Text>
                                    <Text fz="sm" c="dimmed" lineClamp={2}>{n.desc}</Text>
                                </Box>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>
        </>
    );
}
