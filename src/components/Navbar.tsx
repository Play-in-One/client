'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
    SegmentedControl,
    useMantineColorScheme,
    useComputedColorScheme,
    Menu,
    UnstyledButton,
    Accordion,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconSearch,
    IconMoon,
    IconSun,
    IconUserCircle,
    IconFlame,
} from '@tabler/icons-react';
import { useApp } from '@/context/AppContext';
import type { ConditionFilter } from '@/context/AppContext';
import { PLATFORM_GROUPS } from '@/lib/platformGroups';

const CONDITION_OPTIONS = [
    { label: 'Usados', value: 'used' },
    { label: 'Todos', value: 'all' },
    { label: 'Nuevos', value: 'new' },
];

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { searchQuery, setSearchQuery, condition, setCondition } = useApp();
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const { toggleColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
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
                <Group gap="lg" visibleFrom="md" wrap="nowrap">
                    {PLATFORM_GROUPS.map((group) => {
                        const Icon = group.icon;
                        const groupHref = `/search?platform=${group.options.map((o) => o.slug).join(',')}`;
                        return (
                            <Menu key={group.label} trigger="hover" position="bottom" openDelay={0} closeDelay={150}>
                                <Menu.Target>
                                    <UnstyledButton
                                        component={Link}
                                        href={groupHref}
                                        fw={600}
                                        fz="sm"
                                        c="dimmed"
                                        style={{ transition: 'color 0.15s, transform 0.15s' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = group.color;
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = 'var(--mantine-color-dimmed)';
                                            e.currentTarget.style.transform = '';
                                        }}
                                    >
                                        <Group gap={6} wrap="nowrap">
                                            <Icon size={18} />
                                            <Box component="span" visibleFrom="lg">
                                                {group.label}
                                            </Box>
                                        </Group>
                                    </UnstyledButton>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    {group.options.map((opt) => (
                                        <Menu.Item
                                            key={opt.slug}
                                            component={Link}
                                            href={`/search?platform=${opt.slug}`}
                                        >
                                            {opt.label}
                                        </Menu.Item>
                                    ))}
                                </Menu.Dropdown>
                            </Menu>
                        );
                    })}

                    <Box w={1} h={24} bg="var(--mantine-color-default-border)" mx="xs" />

                    <SegmentedControl
                        data={CONDITION_OPTIONS}
                        value={condition}
                        onChange={(v) => setCondition(v as ConditionFilter)}
                        radius="xl"
                        size="sm"
                        classNames={{ root: 'condition-switch' }}
                    />

                    <Button
                        component={Link}
                        href="/search?on_sale=true"
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
                        {computedColorScheme === 'dark' ? <IconSun size={22} /> : <IconMoon size={22} />}
                    </ActionIcon>

                    <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
                </Group>
            </Group>

            {/* Mobile drawer */}
            <Drawer opened={opened} onClose={close} size="xs" title="Menu" position="right">
                <Stack gap="md" mt="md">
                    <Accordion variant="filled">
                        {PLATFORM_GROUPS.map((group) => {
                            const Icon = group.icon;
                            return (
                                <Accordion.Item key={group.label} value={group.label}>
                                    <Accordion.Control>
                                        <Group gap={12}>
                                            <Icon size={24} color={group.color} />
                                            <Text fw={600} fz="lg">
                                                {group.label}
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="sm">
                                            {group.options.map((opt) => (
                                                <Anchor
                                                    key={opt.slug}
                                                    component={Link}
                                                    href={`/search?platform=${opt.slug}`}
                                                    onClick={close}
                                                    fw={600}
                                                    fz="md"
                                                    c="inherit"
                                                    underline="never"
                                                    pl="lg"
                                                >
                                                    {opt.label}
                                                </Anchor>
                                            ))}
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            );
                        })}
                    </Accordion>

                    <Box h={1} bg="var(--mantine-color-default-border)" my="sm" />

                    <SegmentedControl
                        data={CONDITION_OPTIONS}
                        value={condition}
                        onChange={(v) => setCondition(v as ConditionFilter)}
                        radius="xl"
                        size="md"
                        classNames={{ root: 'condition-switch' }}
                        fullWidth
                    />

                    <Button
                        component={Link}
                        href="/search?on_sale=true"
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
