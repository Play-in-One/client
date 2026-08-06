import { Container, SimpleGrid, Skeleton, Stack, Box } from '@mantine/core';

/* Skeleton de la galería mostrado mientras el server component (page.tsx)
   resuelve el fetch inicial de juegos y opciones de filtro. */
export default function SearchLoading() {
    return (
        <Container size="xl" py="xl">
            <Skeleton height={36} width={260} radius="md" mb="xl" />
            <SimpleGrid cols={{ base: 2, xs: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', xs: 'lg' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                    <Box key={i}>
                        <Skeleton radius="lg" style={{ aspectRatio: '3/4', width: '100%' }} />
                        <Stack gap={6} mt="sm">
                            <Skeleton height={10} width="40%" radius="sm" />
                            <Skeleton height={14} width="80%" radius="sm" />
                            <Skeleton height={22} width="55%" radius="sm" mt={4} />
                        </Stack>
                    </Box>
                ))}
            </SimpleGrid>
        </Container>
    );
}
