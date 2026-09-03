'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
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
    Switch,
    useComputedColorScheme,
    useMantineColorScheme,
    Menu,
    UnstyledButton,
    Accordion,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconSearch,
    IconMoon,
    IconSun,
    IconBookmark,
    IconSettings,
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
    const {
        searchQuery, setSearchQuery, condition, setCondition,
        includeInternational, setIncludeInternational,
    } = useApp();
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const { setColorScheme } = useMantineColorScheme();
    /* `getInitialValueInEffect` deja el primer render en un valor fijo y corrige
       tras montar: sin él, leer el esquema durante el render rompería la
       hidratación. El parpadeo que eso provocaría no se ve, porque el control
       vive dentro del menú y el menú no se monta hasta que se abre. */
    const isDark = useComputedColorScheme('light', { getInitialValueInEffect: true }) === 'dark';
    const [opened, { toggle, close }] = useDisclosure(false);
    /* Menú de plataformas controlado por grupo. Sin control, el `trigger="hover"`
       de abajo deja el dropdown abierto para siempre en un dispositivo táctil:
       el tap dispara `mouseenter` pero nunca llega el `mouseleave` que lo
       cerraría. Y como el Navbar vive en el layout, ese dropdown (z-index 300)
       SOBREVIVE el cambio de ruta y se come el siguiente tap sobre la página
       nueva — un juego que "no es clickeable". */
    const [openedMenu, setOpenedMenu] = useState<string | null>(null);

    /* Nada abierto debe cruzar una navegación: ni el drawer (overlay a pantalla
       completa + bloqueo de scroll) ni el menú de arriba. */
    useEffect(() => {
        close();
        setOpenedMenu(null);
    }, [pathname, close]);

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
                <Anchor component={Link} href="/" underline="never" style={{ textDecoration: 'none' }}>
                    <Group gap={8} wrap="nowrap">
                        <Image
                            src="/PIO-punto-negro.svg"
                            alt="Play in One Logo"
                            width={36}
                            height={36}
                            unoptimized
                            className="logo-mark-light"
                            style={{ flexShrink: 0 }}
                        />
                        <Image
                            src="/PIO.svg"
                            alt="Play in One Logo"
                            width={36}
                            height={36}
                            unoptimized
                            className="logo-mark-dark"
                            style={{ flexShrink: 0 }}
                        />
                        <Text
                            fw={800}
                            fz="lg"
                            visibleFrom="sm"
                            className="logo-wordmark"
                            style={{ letterSpacing: '-0.02em' }}
                        >
                            Play<Text span fw={800} c="var(--mantine-color-primaryRed-5)">in</Text>One
                        </Text>
                    </Group>
                </Anchor>

                {/* Desktop nav links */}
                <Group gap="lg" visibleFrom="lg" wrap="nowrap">
                    {PLATFORM_GROUPS.map((group) => {
                        const Icon = group.icon;
                        // El botón del grupo junta varias consolas y no tiene landing:
                        // va al buscador. Cada consola del menú va a SU landing
                        // (`/juegos/<slug>`), que es la página indexable y la que
                        // reparte autoridad hacia las fichas; `/search?platform=` es
                        // noindex y no sumaba nada al rastreo.
                        const groupHref = `/search?platform=${group.options.map((o) => o.slug).join(',')}`;
                        return (
                            <Menu
                                key={group.label}
                                opened={openedMenu === group.label}
                                onChange={(isOpen) => setOpenedMenu(isOpen ? group.label : null)}
                                trigger="hover"
                                position="bottom"
                                openDelay={0}
                                closeDelay={150}
                            >
                                <Menu.Target>
                                    <UnstyledButton
                                        component={Link}
                                        href={groupHref}
                                        fw={600}
                                        fz="sm"
                                        c="dimmed"
                                        style={{ transition: 'color 0.15s' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = group.color;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = 'var(--mantine-color-dimmed)';
                                        }}
                                    >
                                        <Group gap={6} wrap="nowrap">
                                            <Icon size={group.brand === 'PlayStation' ? 22 : 18} />
                                            <Box component="span">
                                                {group.brand}
                                            </Box>
                                        </Group>
                                    </UnstyledButton>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    {group.options.map((opt) => (
                                        <Menu.Item
                                            key={opt.slug}
                                            component={Link}
                                            href={`/juegos/${opt.slug}`}
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

                    <ActionIcon
                        component={Link}
                        href="/saved"
                        variant="subtle"
                        radius="xl"
                        size="lg"
                        visibleFrom="sm"
                        aria-label="Juegos guardados"
                    >
                        <IconBookmark size={22} />
                    </ActionIcon>

                    <Menu shadow="md" width={250} position="bottom-end" withArrow>
                        <Menu.Target>
                            <ActionIcon
                                variant="subtle"
                                radius="xl"
                                size="lg"
                                aria-label="Preferencias"
                            >
                                <IconSettings size={22} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Preferencias</Menu.Label>
                            {/* Un toggle que muestra el ESTADO, no la acción: la
                                versión anterior sólo decía "Modo oscuro" y no
                                se sabía si eso era lo activo o lo que pasaría al
                                pulsar. Leer el esquema en JS es seguro aquí
                                porque el dropdown no se monta hasta que se abre:
                                no hay primer render que hidratar. */}
                            <Menu.Item component="div" closeMenuOnClick={false}>
                                <Switch
                                    checked={isDark}
                                    onChange={(e) => setColorScheme(e.currentTarget.checked ? 'dark' : 'light')}
                                    label="Modo oscuro"
                                    size="sm"
                                    color="primaryRed"
                                    onLabel={<IconMoon size={13} />}
                                    offLabel={<IconSun size={13} />}
                                    styles={{ label: { cursor: 'pointer' } }}
                                />
                            </Menu.Item>

                            <Menu.Divider />

                            {/* Sin onClick en el Menu.Item: el Switch ya es el
                                control accesible y su label lo activa. Poner
                                también un handler aquí hacía que el clic sobre
                                el label lo alternara dos veces —una por el
                                Switch, otra al burbujear— y el valor no cambiaba. */}
                            <Menu.Item component="div" closeMenuOnClick={false}>
                                <Switch
                                    checked={includeInternational}
                                    onChange={(e) => setIncludeInternational(e.currentTarget.checked)}
                                    label="Tiendas internacionales"
                                    size="sm"
                                    color="primaryRed"
                                    styles={{ label: { cursor: 'pointer' } }}
                                />
                                <Text fz="xs" c="dimmed" mt={4}>
                                    Al apagarlas, sus ofertas dejan de contar en toda la plataforma.
                                </Text>
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>

                    <Burger opened={opened} onClick={toggle} hiddenFrom="lg" size="sm" />
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
                                                {group.brand}
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="sm">
                                            {group.options.map((opt) => (
                                                <Anchor
                                                    key={opt.slug}
                                                    component={Link}
                                                    href={`/juegos/${opt.slug}`}
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
                        href="/saved"
                        onClick={close}
                        variant="light"
                        radius="xl"
                        size="md"
                        leftSection={<IconBookmark size={20} />}
                    >
                        Mis Guardados
                    </Button>
                </Stack>
            </Drawer>
        </Box>
    );
}
