import Link from 'next/link';
import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { FAMILIES, platformsOf } from '@/lib/platforms';

/* Cuerpo de la 404, compartido por `app/not-found.tsx` y por las vistas que
   solo el staff puede ver (consolas en vista previa): a un visitante le
   responden lo mismo que una URL inexistente. Sin compuestos de Mantine:
   revientan en RSC (ver CLAUDE.md). */

/* Una salida por marca desde la 404, sacada del catálogo: la consola que
   encabeza cada familia. Estaba escrita a mano y apuntaba a `/juegos/pc`, que
   ya no existe. */
const LANDINGS = FAMILIES.map(({ family }) => {
    const platform = platformsOf(family).find((p) => p.featured) ?? platformsOf(family)[0];
    return { href: `/juegos/${platform.slug}`, label: `Juegos ${platform.long}` };
});

export default function NotFoundBody() {
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
