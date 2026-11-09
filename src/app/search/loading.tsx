import { Container, Group, Text } from '@mantine/core';
import ExplorerSkeleton from '@/components/game-explorer/ExplorerSkeleton';
import SkeletonLine from '@/components/skeleton/SkeletonLine';
import { CONSOLES_PUBLIC } from '@/lib/features';

/* Esqueleto de `/search` mientras el servidor resuelve la primera página. Es
   la MISMA estructura que pinta la página: la barra Juegos | Consolas y
   `GameExplorer` con cabecera, buscador y panel de filtros (ver
   `ExplorerSkeleton`).

   Reserva el título de una BÚSQUEDA («Resultados para "…"», dos líneas en un
   teléfono): la entrada limpia a `/search` es estática y se precarga, así que
   este esqueleto se ve casi solo al buscar. Servidor a propósito: un
   `useSearchParams` aquí rompe el prerender de `/search` en el build. */
export default function SearchLoading() {
    return (
        <>
            {CONSOLES_PUBLIC && (
                <Container size="lg" pt="lg">
                    <Group gap="lg">
                        <Text component="div" fw={700}><SkeletonLine width={56} /></Text>
                        <Text component="div"><SkeletonLine width={64} /></Text>
                    </Group>
                </Container>
            )}
            <ExplorerSkeleton longTitle />
        </>
    );
}
