import Link from 'next/link';
import { IconChevronLeft, IconChevronRight, IconDots } from '@tabler/icons-react';
import styles from './CrawlablePagination.module.css';

/**
 * Paginación navegable por un crawler.
 *
 * El `Pagination` de Mantine que usa `/search` emite `<button>` y guarda la
 * página en estado de React: perfecto para una galería filtrable, invisible
 * para Google. Sin enlaces `<a href>` reales servidos por el servidor, todo lo
 * que hay más allá de la primera página es inalcanzable — así el 96% del
 * catálogo quedaba huérfano aunque estuviera listado en el sitemap.
 *
 * Se VE igual que el de Mantine (mismas cajas, color, flechas y ventana de
 * páginas; ver el `.module.css`), para que todas las paginaciones del sitio
 * sean una sola: antes esta eran enlaces de texto rojo.
 *
 * Es un Server Component a propósito: sin estado, sin hooks y sin
 * `useSearchParams()`, que sacaría su subárbol del render del servidor y
 * devolvería el problema al punto de partida.
 */

/** La misma ventana que `usePagination` de Mantine (1 hermana a cada lado y
 *  1 página de borde): siempre 7 huecos, p. ej. `1 2 3 4 5 … 384`,
 *  `1 … 9 10 11 … 384` o `1 … 380 381 382 383 384`. */
export function pageWindow(current: number, total: number): (number | 'gap')[] {
    const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
    if (total <= 7) return range(1, total);
    if (current <= 4) return [...range(1, 5), 'gap', total];
    if (current >= total - 3) return [1, 'gap', ...range(total - 4, total)];
    return [1, 'gap', current - 1, current, current + 1, 'gap', total];
}

export default function CrawlablePagination({
    current,
    total,
    hrefFor,
}: {
    current: number;
    total: number;
    /** Cómo se construye la URL de cada página. */
    hrefFor: (page: number) => string;
}) {
    if (total <= 1) return null;

    const arrow = (page: number, label: string, icon: React.ReactNode) =>
        page < 1 || page > total ? (
            <span className={styles.control} data-disabled aria-disabled="true" aria-label={label}>{icon}</span>
        ) : (
            <Link className={styles.control} href={hrefFor(page)} aria-label={label} rel={page < current ? 'prev' : 'next'}>
                {icon}
            </Link>
        );

    return (
        <nav aria-label="Paginación" className={styles.root}>
            {arrow(current - 1, 'Página anterior', <IconChevronLeft size={16} stroke={1.75} aria-hidden />)}
            {pageWindow(current, total).map((page, i) =>
                page === 'gap' ? (
                    <span key={`gap-${i}`} className={styles.dots} aria-hidden><IconDots size={16} /></span>
                ) : page === current ? (
                    <span key={page} className={styles.control} data-active aria-current="page">{page}</span>
                ) : (
                    <Link key={page} className={styles.control} href={hrefFor(page)} aria-label={`Página ${page}`}>
                        {page}
                    </Link>
                ),
            )}
            {arrow(current + 1, 'Página siguiente', <IconChevronRight size={16} stroke={1.75} aria-hidden />)}
        </nav>
    );
}
