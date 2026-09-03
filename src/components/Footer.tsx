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
    useComputedColorScheme,
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
    IconBrandTumblr,
    IconBrandTelegram,
} from '@tabler/icons-react';
import { social } from '@/lib/colors';
import { siteConfig } from '@/lib/seo';
import { trackEvent, type SocialNetwork } from '@/lib/api';
import { PLATFORM_GROUPS } from '@/lib/platformGroups';

/* Landings por consola enlazadas desde el pie de TODAS las páginas. Salen de
   los grupos del Navbar (misma fuente que el menú) más Xbox genérico y PC, que no
   tienen grupo pero sí existen en el catálogo. */
const FOOTER_LANDINGS: { slug: string; label: string }[] = [
    ...PLATFORM_GROUPS.flatMap((g) => g.options.map((o) => ({ slug: o.slug, label: o.label }))),
    { slug: 'xbox', label: 'Xbox' },
    { slug: 'pc', label: 'PC' },
];

const YEAR = new Date().getFullYear();

/**
 * Un enlace de red social del footer.
 *
 * El `network` no es decorativo: viaja en el evento y es lo que permite saber
 * cuál de los quince enlaces se gana el rincón que ocupa. El track vive aquí
 * dentro y no en cada llamada, que es lo que garantiza que ninguna red se
 * quede sin medir por olvido — el mismo patrón que `GameCard`.
 */
function SocialIcon({ icon: Icon, brandColor, href, network }: {
    icon: ComponentType<{ size?: number; className?: string }>,
    brandColor: string,
    href: string,
    network: SocialNetwork,
}) {
    const [hover, setHover] = useState(false);
    const colorScheme = useComputedColorScheme('light');
    // Threads es negro puro: en modo oscuro sería invisible sobre el fondo, así que se invierte.
    const resolvedColor = brandColor === '#000000' && colorScheme === 'dark' ? '#ffffff' : brandColor;
    return (
        <ActionIcon
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            color={hover ? resolvedColor : 'gray'}
            size="lg"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            // `target="_blank"` no descarga el documento, así que el beacon sale
            // igual; y aunque lo hiciera, sendBeacon sobrevive al unload.
            onClick={() => trackEvent({ event_type: 'social_click', social_network: network })}
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
                        {/* A la landing por consola, no a /search?platform=:
                            esa variante va noindex y se renderiza en el cliente,
                            así que estos enlaces no llevaban a nada indexable.
                            Van TODAS las consolas y no una muestra: el menú del
                            Navbar es un dropdown que no existe en el HTML del
                            servidor, así que este bloque es el único enlace que
                            recibe cada landing desde todas las páginas. */}
                        <SimpleGrid cols={2} spacing={4} verticalSpacing={4}>
                            {FOOTER_LANDINGS.map((l) => (
                                <Anchor key={l.slug} component={Link} href={`/juegos/${l.slug}`} fz="sm" c="dimmed" underline="never">
                                    {l.label}
                                </Anchor>
                            ))}
                        </SimpleGrid>
                    </Stack>

                    {/* Empresa */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Empresa</Text>
                        <Anchor component={Link} href="/contact" fz="sm" c="dimmed" underline="never">Contacto</Anchor>
                        <Anchor component={Link} href="/about" fz="sm" c="dimmed" underline="never">Sobre Nosotros</Anchor>
                        <Anchor component={Link} href="/terms" fz="sm" c="dimmed" underline="never">Términos de Servicio</Anchor>
                        <Anchor component={Link} href="/privacy" fz="sm" c="dimmed" underline="never">Política de Privacidad</Anchor>
                        <Anchor component={Link} href="/cookies" fz="sm" c="dimmed" underline="never">Cookies</Anchor>
                        <Anchor component={Link} href="/blog" fz="sm" c="dimmed" underline="never">Blog</Anchor>
                        <Anchor component={Link} href="/faq" fz="sm" c="dimmed" underline="never">Preguntas frecuentes</Anchor>
                    </Stack>

                    {/* Newsletter */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Siguenos</Text>
                        <Text fz="sm" c="dimmed">Mantente al dia de las mejores ofertas y novedades.</Text>
                        <Group gap="xs">
                            <SocialIcon icon={IconBrandInstagram} brandColor={social.instagram} href={siteConfig.social.instagram} network="instagram" />
                            <SocialIcon icon={IconBrandFacebook} brandColor={social.facebook} href={siteConfig.social.facebook} network="facebook" />
                            <SocialIcon icon={IconBrandX} brandColor="gray" href={siteConfig.social.twitter} network="twitter" />
                            <SocialIcon icon={IconBrandLinkedin} brandColor={social.linkedin} href={siteConfig.social.linkedin} network="linkedin" />
                            <SocialIcon icon={IconBrandReddit} brandColor={social.reddit} href={siteConfig.social.reddit} network="reddit" />
                            <SocialIcon icon={IconBrandTiktok} brandColor={social.tiktok} href={siteConfig.social.tiktok} network="tiktok" />
                            <SocialIcon icon={IconBrandYoutube} brandColor={social.youtube} href={siteConfig.social.youtube} network="youtube" />
                            <SocialIcon icon={IconBrandPinterest} brandColor={social.pinterest} href={siteConfig.social.pinterest} network="pinterest" />
                            <SocialIcon icon={IconBrandGmail} brandColor={social.gmail} href={siteConfig.social.gmail} network="gmail" />
                            <SocialIcon icon={IconBrandDiscord} brandColor={social.discord} href={siteConfig.social.discord} network="discord" />
                            <SocialIcon icon={IconBrandSpotify} brandColor={social.spotify} href={siteConfig.social.spotify} network="spotify" />
                            <SocialIcon icon={IconBrandWhatsapp} brandColor={social.whatsapp} href={siteConfig.social.whatsapp} network="whatsapp" />
                            <SocialIcon icon={IconBrandThreads} brandColor={social.threads} href={siteConfig.social.threads} network="threads" />
                            <SocialIcon icon={IconBrandTumblr} brandColor={social.tumblr} href={siteConfig.social.tumblr} network="tumblr" />
                            <SocialIcon icon={IconBrandTelegram} brandColor={social.telegram} href={siteConfig.social.telegram} network="telegram" />
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
