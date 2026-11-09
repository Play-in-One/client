'use client';

import { useRouter } from 'next/navigation';
import { Badge, Box, Button, Container, Text, Title } from '@mantine/core';
import { IconFlame, IconSearch } from '@tabler/icons-react';
import SearchForm from '@/components/SearchForm';
import { FindConsoleButton } from '@/components/consoles/FindConsoleButton';
import { decorative, elevation, surfaces } from '@/lib/colors';

/** A small hydration boundary: the first key must not hydrate the catalogue. */
export default function HomeHero({ consolesAvailable = false }: { consolesAvailable?: boolean }) {
    const router = useRouter();
    const handleSearch = (query: string) => {
        if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
    };

    return (
        <Box
            className="pio-home-hero"
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

                <Title order={1} className="pio-home-hero-title" fw={800} lh={1.15} mb="md">
                    Encuentra tu próximo juego{' '}
                    <br style={{ display: 'none' }} className="hiddenMobile" />
                    <Text component="span" className="gradient-text" inherit>
                        al mejor precio
                    </Text>
                </Title>

                <Text className="pio-home-hero-description" c="dimmed" maw={600} mx="auto" mb="xl">
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
                    <SearchForm onSearch={handleSearch}
                        groupProps={{ pos: 'relative', p: '2xs', style: {
                            borderRadius: 'var(--mantine-radius-xl)',
                            background: `light-dark(${surfaces.light.heroSearchBar}, ${surfaces.dark.heroSearchBar})`,
                            boxShadow: elevation.raised,
                            border: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))',
                        } }}
                        inputProps={{ placeholder: 'Ej: Elden Ring, FIFA 24, Zelda...',
                            leftSection: <IconSearch size={22} style={{ color: 'var(--mantine-color-dimmed)' }} />,
                            size: 'lg', radius: 'xl', styles: {
                                input: { border: 'none', background: 'transparent', fontSize: 'var(--mantine-font-size-md)' },
                                root: { flex: 1 },
                            },
                        }}>
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
                    </SearchForm>
                </Box>

                {/* Hardware: from the hero to the console catalog (staff preview: admins only).
                    No wrapper: a visitor who does not get the button gets no gap either. */}
                <FindConsoleButton available={consolesAvailable} align="center" />

            </Container>
        </Box>

    );
}
