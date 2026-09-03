import type { Metadata } from 'next';
import Link from 'next/link';
import { Anchor, Container, Stack, Text, Title } from '@mantine/core';

/* 404 propia. La genérica de Next no enlazaba nada: quien llega a una URL
   muerta (un juego fusionado, un enlace viejo) se quedaba sin camino, y un
   crawler también. Server Component sin compuestos de Mantine (revientan en
   RSC, ver CLAUDE.md). El status 404 lo pone Next; esto es solo el cuerpo. */

export const metadata: Metadata = {
    title: 'Página no encontrada',
    robots: { index: false, follow: true },
    // Sin canonical: el layout raíz pone `/` por defecto y una 404 que se
    // declara canónica de la home es una señal contradictoria.
    alternates: { canonical: null },
};

const LANDINGS = [
    { href: '/juegos/ps5', label: 'Juegos PS5' },
    { href: '/juegos/switch', label: 'Juegos Nintendo Switch' },
    { href: '/juegos/xbox', label: 'Juegos Xbox' },
    { href: '/juegos/pc', label: 'Juegos PC' },
];

export default function NotFound() {
    return (
        <Container size="sm" py={80}>
            <Stack gap="md" align="flex-start">
                <Title order={1}>Página no encontrada</Title>
                <Text c="dimmed">
                    Esta dirección no existe o el juego ya no está en el catálogo. Puedes
                    buscarlo por nombre o entrar por consola.
                </Text>
                <Anchor component={Link} href="/search" fw={600}>Buscar un juego</Anchor>
                {LANDINGS.map((l) => (
                    <Anchor key={l.href} component={Link} href={l.href}>{l.label}</Anchor>
                ))}
                <Anchor component={Link} href="/" c="dimmed">Volver al inicio</Anchor>
            </Stack>
        </Container>
    );
}
