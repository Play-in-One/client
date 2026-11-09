import ExplorerSkeleton from '@/components/game-explorer/ExplorerSkeleton';

/* Esqueleto de `/search` mientras el servidor resuelve la primera página. Es
   la MISMA estructura que pinta la página: `GameExplorer` con cabecera,
   buscador y panel de filtros (ver `ExplorerSkeleton`).

   Reserva el título de una BÚSQUEDA («Resultados para "…"», dos líneas en un
   teléfono): la entrada limpia a `/search` es estática y se precarga, así que
   este esqueleto se ve casi solo al buscar. Servidor a propósito: un
   `useSearchParams` aquí rompe el prerender de `/search` en el build. */
export default function SearchLoading() {
    return (
        <ExplorerSkeleton longTitle />
    );
}
