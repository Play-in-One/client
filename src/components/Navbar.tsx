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
    Button,
    useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconSearch,
    IconMoon,
    IconSun,
    IconUserCircle,
    IconFlame,
} from '@tabler/icons-react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import { useApp } from '@/context/AppContext';

const NAV_LINKS = [
    { label: 'PS5', href: '/search?platform=ps5', icon: FaPlaystation, color: '#2563EB' },
    { label: 'Switch', href: '/search?platform=switch', icon: BsNintendoSwitch, color: '#DC2626' },
    { label: 'Xbox', href: '/search?platform=xbox', icon: FaXbox, color: '#16A34A' },
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
            className="navbar-bg"
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
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
                    {NAV_LINKS.map((l) => {
                        const Icon = l.icon;
                        return (
                            <Anchor
                                key={l.label}
                                href={l.href}
                                underline="never"
                                fw={600}
                                fz="sm"
                                c="dimmed"
                                style={{ transition: 'color 0.15s, transform 0.15s' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = l.color;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--mantine-color-dimmed)';
                                    e.currentTarget.style.transform = '';
                                }}
                            >
                                <Group gap={6}>
                                    <Icon size={18} />
                                    {l.label}
                                </Group>
                            </Anchor>
                        );
                    })}

                    <Box w={1} h={24} bg="var(--mantine-color-default-border)" mx="xs" />

                    <Button
                        component="a"
                        href="/search?ordering=-current_price"
                        variant="gradient"
                        gradient={{ from: 'primaryRed', to: 'orange', deg: 90 }}
                        radius="xl"
                        size="sm"
                        leftSection={<IconFlame size={16} />}
                        style={{ boxShadow: '0 4px 14px rgba(230,57,70,0.25)' }}
                    >
                        Ofertas
                    </Button>
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
                                classNames={{ input: 'search-input' }}
                                styles={{
                                    input: {
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
                    {NAV_LINKS.map((l) => {
                        const Icon = l.icon;
                        return (
                            <Anchor
                                key={l.label}
                                href={l.href}
                                onClick={close}
                                fw={600}
                                fz="lg"
                                c="inherit"
                                underline="never"
                            >
                                <Group gap={12}>
                                    <Icon size={24} color={l.color} />
                                    {l.label}
                                </Group>
                            </Anchor>
                        );
                    })}

                    <Box h={1} bg="var(--mantine-color-default-border)" my="sm" />

                    <Button
                        component="a"
                        href="/search?ordering=-current_price"
                        onClick={close}
                        variant="gradient"
                        gradient={{ from: 'primaryRed', to: 'orange', deg: 90 }}
                        radius="xl"
                        size="md"
                        leftSection={<IconFlame size={20} />}
                        style={{ boxShadow: '0 4px 14px rgba(230,57,70,0.25)' }}
                    >
                        Ver Ofertas
                    </Button>
                </Stack>
            </Drawer>
        </Box>
    );
}
