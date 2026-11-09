import { SimpleGrid } from '@mantine/core';
import GameCardSkeleton from '@/components/GameCardSkeleton';
import { SHELF_GRID, type GridLayout } from '@/lib/gridLayout';

/* Grilla de `GameCardSkeleton`. Recibe la MISMA constante de grilla
   (`lib/gridLayout.ts`) que la grilla real a la que reemplaza: con columnas o
   huecos distintos, el relevo movía la página aunque cada tarjeta midiera lo
   mismo. Lo comparten la home, los relacionados de la ficha, `/search` y los
   `loading.tsx` de las galerías. */
export default function GameGridSkeleton({ count = 8, testId, grid = SHELF_GRID }: {
    count?: number;
    testId?: string;
    grid?: GridLayout;
}) {
    return (
        <SimpleGrid {...grid} aria-busy="true" data-testid={testId}>
            {Array.from({ length: count }).map((_, i) => <GameCardSkeleton key={i} />)}
        </SimpleGrid>
    );
}
