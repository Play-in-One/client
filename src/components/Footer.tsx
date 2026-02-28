'use client';

import { useState } from 'react';

import {
    Box,
    Container,
    Group,
    Text,
    Anchor,
    SimpleGrid,
    TextInput,
    Button,
    Stack,
    ActionIcon,
} from '@mantine/core';
import {
    IconBrandTiktok,
    IconBrandX,
    IconBrandInstagram,
    IconBrandFacebook,
    IconBrandYoutube
} from '@tabler/icons-react';

const YEAR = new Date().getFullYear();

function SocialIcon({ icon: Icon, brandColor, href }: { icon: any, brandColor: string, href: string }) {
    const [hover, setHover] = useState(false);
    return (
        <ActionIcon
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            color={hover ? brandColor : 'gray'}
            size="lg"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ transition: 'all 0.2s ease' }}
        >
            <Icon size={24} />
        </ActionIcon>
    );
}

export default function Footer() {
    return (
        <Box
            component="footer"
            pt={60}
            pb={32}
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
            <Container size="lg">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
                    {/* Brand */}
                    <Stack gap="sm">
                        <Group gap={8}>
                            <Box
                                w={32}
                                h={32}
                                style={{
                                    borderRadius: '50%',
                                    background: 'var(--mantine-color-primaryRed-5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: 12,
                                }}
                            >
                                P1
                            </Box>
                            <Text fw={700} fz="lg">
                                Play<Text span c="var(--mantine-color-primaryRed-5)">in</Text>One
                            </Text>
                        </Group>
                        <Text fz="sm" c="dimmed" maw={280}>
                            La forma más inteligente de comprar videojuegos en Chile. Rastreamos precios para que
                            tú solo te preocupes de jugar.
                        </Text>
                    </Stack>

                    {/* Categorías */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Categorías</Text>
                        <Anchor href="/platform/ps5" fz="sm" c="dimmed" underline="never">PlayStation 5</Anchor>
                        <Anchor href="/platform/switch" fz="sm" c="dimmed" underline="never">Nintendo Switch</Anchor>
                        <Anchor href="/platform/xbox" fz="sm" c="dimmed" underline="never">Xbox Series X</Anchor>
                        <Anchor href="/platform/pc" fz="sm" c="dimmed" underline="never">Juegos PC</Anchor>
                    </Stack>

                    {/* Empresa */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Empresa</Text>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Sobre Nosotros</Anchor>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Contacto</Anchor>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Blog</Anchor>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Términos de Servicio</Anchor>
                    </Stack>

                    {/* Newsletter */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Siguenos</Text>
                        <Text fz="sm" c="dimmed">Mantente al dia de las mejores ofertas y novedades.</Text>
                        <Group gap="xs">
                            <SocialIcon icon={IconBrandInstagram} brandColor="#E1306C" href="https://instagram.com/" />
                            <SocialIcon icon={IconBrandFacebook} brandColor="#1877F2" href="https://facebook.com/" />
                            <SocialIcon icon={IconBrandX} brandColor="gray" href="https://twitter.com/" />
                            <SocialIcon icon={IconBrandTiktok} brandColor="#ff0050" href="https://tiktok.com/" />
                            <SocialIcon icon={IconBrandYoutube} brandColor="#FF0000" href="https://youtube.com/" />
                        </Group>
                    </Stack>
                </SimpleGrid>

                {/* Bottom bar */}
                <Group
                    justify="space-between"
                    mt={48}
                    pt={24}
                    style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                >
                    <Text fz="xs" c="dimmed">
                        © {YEAR} Play in One Chile. Todos los derechos reservados.
                    </Text>
                </Group>
            </Container>
        </Box>
    );
}
