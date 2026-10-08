import { Box, SimpleGrid, Skeleton, Stack } from '@mantine/core';

/* Skeleton de una grilla de GameCard — mismas proporciones que la tarjeta,
   mismo patrón visual que search/loading.tsx. Lo comparten «Populares» de la
   home y los relacionados de la ficha: los dos tapan con él la grilla sin
   filtrar mientras el refetch con los filtros globales está en vuelo, y dos
   esqueletos distintos para la misma tarjeta acabarían divergiendo. */
export default function GameGridSkeleton({ count = 8, testId }: { count?: number; testId?: string }) {
    return (
        <SimpleGrid
            cols={{ base: 2, xs: 2, md: 4 }}
            spacing={{ base: 'xs', xs: 'lg' }}
            aria-busy="true"
            data-testid={testId}
        >
            {Array.from({ length: count }).map((_, i) => (
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
    );
}
