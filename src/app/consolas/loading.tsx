import { ConsoleCatalogSkeleton } from '@/components/consoles/ConsoleCatalog';

/* `/consolas` lee `searchParams`: es dinámica y su enlace no se precarga
   entero, así que sin este boundary el clic dejaba la página anterior quieta
   hasta tener el catálogo. El esqueleto es el del propio catálogo, con su
   cabecera, la barra de filtros y la grilla (ver `ConsoleCatalogSkeleton`).
   No afecta a ningún status: la página solo responde 404 con las consolas
   apagadas por configuración, y entonces nadie la enlaza. */
export default function ConsolesLoading() {
    return <ConsoleCatalogSkeleton />;
}
