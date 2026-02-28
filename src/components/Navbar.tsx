'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import {
    Group,
    Text,
    TextInput,
    ActionIcon,
    Anchor,
    Box,
    Burger,
    Drawer,
    Stack,
    useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconSearch,
    IconMoon,
    IconSun,
    IconUserCircle,
} from '@tabler/icons-react';
import { useApp } from '@/context/AppContext';

const NAV_LINKS = [
    { label: 'PS5', href: '/platform/ps5' },
    { label: 'Switch', href: '/platform/switch' },
    { label: 'Xbox', href: '/platform/xbox' },
    { label: 'PC', href: '/platform/pc' },
    { label: 'Ofertas', href: '/search?ordering=-current_price', accent: true },
];

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { searchQuery, setSearchQuery } = useApp();
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();
    const [opened, { toggle, close }] = useDisclosure(false);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        setSearchQuery(localQuery);
        router.push(`/search?q=${encodeURIComponent(localQuery)}`);
    };

    return (
        <Box
            component="nav"
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
            bg={colorScheme === 'dark' ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)'}
        >
            <Group
                justify="space-between"
                h={72}
                px="md"
                maw={1280}
                mx="auto"
                wrap="nowrap"
            >
                {/* Logo */}
                <Anchor href="/" underline="never" style={{ textDecoration: 'none' }}>
                    <Group gap={8} wrap="nowrap">
                        <Image
                            src="/PIO.png"
                            alt="Play in One Logo"
                            width={84}
                            height={84}
                            style={{ flexShrink: 0, borderRadius: '50%' }}
                        />
                        <Text fw={800} fz="xl" c="inherit" visibleFrom="sm">
                            Play<Text span c="var(--mantine-color-primaryRed-5)">in</Text>One
                        </Text>
                    </Group>
                </Anchor>

                {/* Desktop nav links */}
                <Group gap="lg" visibleFrom="md">
                    {NAV_LINKS.map((l) => (
                        <Anchor
                            key={l.label}
                            href={l.href}
                            underline="never"
                            fw={l.accent ? 600 : 500}
                            c={l.accent ? 'var(--mantine-color-primaryRed-5)' : undefined}
                            fz="sm"
                            style={{ transition: 'color 0.15s' }}
                        >
                            {l.label}
                        </Anchor>
                    ))}
                </Group>

                {/* Search + actions */}
                <Group gap="sm" wrap="nowrap">
                    {pathname !== '/' && (
                        <form onSubmit={handleSearch}>
                            <TextInput
                                placeholder="Buscar juegos..."
                                leftSection={<IconSearch size={18} />}
                                value={localQuery}
                                onChange={(e) => setLocalQuery(e.currentTarget.value)}
                                radius="xl"
                                size="sm"
                                w={{ base: 160, sm: 260, lg: 340 }}
                                styles={{
                                    input: {
                                        background: colorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-1)',
                                        border: 'none',
                                    },
                                }}
                            />
                        </form>
                    )}

                    {/* <ActionIcon variant="subtle" radius="xl" size="lg" visibleFrom="sm">
                        <IconUserCircle size={22} />
                    </ActionIcon> */}

                    <ActionIcon variant="subtle" radius="xl" size="lg" onClick={toggleColorScheme}>
                        {colorScheme === 'dark' ? <IconSun size={22} /> : <IconMoon size={22} />}
                    </ActionIcon>

                    <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
                </Group>
            </Group>

            {/* Mobile drawer */}
            <Drawer opened={opened} onClose={close} size="xs" title="Menu" position="right">
                <Stack gap="md" mt="md">
                    {NAV_LINKS.map((l) => (
                        <Anchor
                            key={l.label}
                            href={l.href}
                            onClick={close}
                            fw={l.accent ? 600 : 500}
                            c={l.accent ? 'var(--mantine-color-primaryRed-5)' : undefined}
                            fz="lg"
                            underline="never"
                        >
                            {l.label}
                        </Anchor>
                    ))}
                </Stack>
            </Drawer>
        </Box>
    );
}
