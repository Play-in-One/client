'use client';

import { type ComponentType, useState } from 'react';
import Link from 'next/link';

import Image from 'next/image';
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
    IconBrandYoutube,
    IconBrandLinkedin,
    IconBrandReddit,
    IconBrandPinterest,
    IconBrandGmail,
    IconBrandDiscord,
    IconBrandSpotify,
    IconBrandWhatsapp,
    IconBrandThreads,
} from '@tabler/icons-react';
import { social } from '@/lib/colors';
import { siteConfig } from '@/lib/seo';

const YEAR = new Date().getFullYear();

function SocialIcon({ icon: Icon, brandColor, href }: { icon: ComponentType<{ size?: number; className?: string }>, brandColor: string, href: string }) {
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
                            <Image
                                src="/PIO-punto-negro.svg"
                                alt="Play in One Logo"
                                width={26}
                                height={32}
                                unoptimized
                                className="logo-mark-light"
                                style={{ flexShrink: 0 }}
                            />
                            <Image
                                src="/PIO.svg"
                                alt="Play in One Logo"
                                width={26}
                                height={32}
                                unoptimized
                                className="logo-mark-dark"
                                style={{ flexShrink: 0 }}
                            />
                            <Text
                                fw={800}
                                fz="lg"
                                className="logo-wordmark"
                                style={{ letterSpacing: '-0.02em' }}
                            >
                                Play<Text span fw={800} c="var(--mantine-color-primaryRed-5)">in</Text>One
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
                        <Anchor component={Link} href="/search?platform=ps5" fz="sm" c="dimmed" underline="never">PlayStation 5</Anchor>
                        <Anchor component={Link} href="/search?platform=switch" fz="sm" c="dimmed" underline="never">Nintendo Switch</Anchor>
                        <Anchor component={Link} href="/search?platform=xbox" fz="sm" c="dimmed" underline="never">Xbox Series X</Anchor>
                        <Anchor component={Link} href="/search?platform=pc" fz="sm" c="dimmed" underline="never">Juegos PC</Anchor>
                    </Stack>

                    {/* Empresa */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Empresa</Text>
                        <Anchor component={Link} href="/about" fz="sm" c="dimmed" underline="never">Sobre Nosotros</Anchor>
                        <Anchor component={Link} href="/contact" fz="sm" c="dimmed" underline="never">Contacto</Anchor>
                        <Anchor component={Link} href="/blog" fz="sm" c="dimmed" underline="never">Blog</Anchor>
                        <Anchor component={Link} href="/saved" fz="sm" c="dimmed" underline="never">Juegos Guardados</Anchor>
                        <Anchor component={Link} href="/terms" fz="sm" c="dimmed" underline="never">Términos de Servicio</Anchor>
                    </Stack>

                    {/* Newsletter */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Siguenos</Text>
                        <Text fz="sm" c="dimmed">Mantente al dia de las mejores ofertas y novedades.</Text>
                        <Group gap="xs">
                            <SocialIcon icon={IconBrandInstagram} brandColor={social.instagram} href={siteConfig.social.instagram} />
                            <SocialIcon icon={IconBrandFacebook} brandColor={social.facebook} href={siteConfig.social.facebook} />
                            <SocialIcon icon={IconBrandX} brandColor="gray" href={siteConfig.social.twitter} />
                            <SocialIcon icon={IconBrandLinkedin} brandColor={social.linkedin} href={siteConfig.social.linkedin} />
                            <SocialIcon icon={IconBrandReddit} brandColor={social.reddit} href={siteConfig.social.reddit} />
                            <SocialIcon icon={IconBrandTiktok} brandColor={social.tiktok} href={siteConfig.social.tiktok} />
                            <SocialIcon icon={IconBrandYoutube} brandColor={social.youtube} href={siteConfig.social.youtube} />
                            <SocialIcon icon={IconBrandPinterest} brandColor={social.pinterest} href={siteConfig.social.pinterest} />
                            <SocialIcon icon={IconBrandGmail} brandColor={social.gmail} href={siteConfig.social.gmail} />
                            <SocialIcon icon={IconBrandDiscord} brandColor={social.discord} href={siteConfig.social.discord} />
                            <SocialIcon icon={IconBrandSpotify} brandColor={social.spotify} href={siteConfig.social.spotify} />
                            <SocialIcon icon={IconBrandWhatsapp} brandColor={social.whatsapp} href={siteConfig.social.whatsapp} />
                            <SocialIcon icon={IconBrandThreads} brandColor={social.threads} href={siteConfig.social.threads} />
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
