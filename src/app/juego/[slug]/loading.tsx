import { Box, Container, Flex, Group, Skeleton, Stack } from '@mantine/core';

/* Skeleton del detalle de juego, mostrado mientras el server component
   (page.tsx) resuelve `getGame`.

   No es solo cosmético: sin un boundary de carga, el App Router no puede
   PREFETCHEAR una ruta dinámica —el prefetch de /juego/[slug] devolvía una
   respuesta vacía— y bloqueaba la navegación entera esperando el RSC, entre 1 y
   4 s contra el backend de producción, sin pintar nada. La tarjeta clicada
   parecía simplemente muerta.

   Server Component a propósito, como `search/loading.tsx`: por eso no usa
   `Grid`/`Grid.Col` ni ningún otro compuesto de Mantine (llegan como
   `undefined` fuera del cliente, ver CLAUDE.md), sino un Flex con wrap. */
export default function GameDetailLoading() {
    return (
        <Container size="lg" py="xl">
            {/* Breadcrumbs */}
            <Skeleton height={14} width={260} radius="sm" mb="xl" />

            <Flex gap="xl" wrap="wrap" align="flex-start">
                {/* ── Sidebar: portada + fichas ── */}
                <Box style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <Box maw={{ base: '85%', lg: '100%' }} mx={{ base: 'auto', lg: 0 }}>
                        <Skeleton radius="lg" style={{ aspectRatio: '3/4', width: '100%' }} />
                    </Box>

                    <Stack gap="md" mt="md">
                        {/* Ficha de datos */}
                        <Skeleton height={132} radius="lg" />
                        {/* Acerca del juego */}
                        <Skeleton height={148} radius="lg" />
                    </Stack>
                </Box>

                {/* ── Contenido: título, tabs de consola y ofertas ── */}
                <Box style={{ flex: '2 1 480px', minWidth: 0 }}>
                    <Stack gap="xl">
                        <Box>
                            <Group gap="sm" mb={6}>
                                <Skeleton height={20} width={70} radius="xl" />
                                <Skeleton height={20} width={90} radius="xl" />
                            </Group>
                            <Skeleton height={38} width="75%" radius="md" mb="sm" />
                            <Skeleton height={40} width={220} radius="md" />
                        </Box>

                        <Stack gap="md">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} height={104} radius="lg" />
                            ))}
                        </Stack>
                    </Stack>
                </Box>
            </Flex>
        </Container>
    );
}
