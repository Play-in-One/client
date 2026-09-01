import Link from 'next/link';
import { Anchor, Group, Text } from '@mantine/core';

/**
 * Paginación navegable por un crawler.
 *
 * El `Pagination` de Mantine que usa `/search` emite `<button>` y guarda la
 * página en estado de React: perfecto para una galería filtrable, invisible
 * para Google. Sin enlaces `<a href>` reales servidos por el servidor, todo lo
 * que hay más allá de la primera página es inalcanzable — así el 96% del
 * catálogo quedaba huérfano aunque estuviera listado en el sitemap.
 *
 * Es un Server Component a propósito: sin estado, sin hooks y sin
 * `useSearchParams()`, que sacaría su subárbol del render del servidor y
 * devolvería el problema al punto de partida.
 */

/** Primera, última y una ventana alrededor de la actual; el resto, elipsis. */
function pageWindow(current: number, total: number): (number | 'gap')[] {
    const shown = new Set<number>([1, total, current]);
    for (let d = 1; d <= 2; d++) {
        if (current - d >= 1) shown.add(current - d);
        if (current + d <= total) shown.add(current + d);
    }
    const out: (number | 'gap')[] = [];
    let prev = 0;
    for (const page of [...shown].sort((a, b) => a - b)) {
        if (prev && page - prev > 1) out.push('gap');
        out.push(page);
        prev = page;
    }
    return out;
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

    return (
        <Group component="nav" aria-label="Paginación" justify="center" gap="xs" mt="xl">
            {current > 1 && (
                <Anchor component={Link} href={hrefFor(current - 1)} fz="sm" c="primaryRed" underline="hover">
                    ← Anterior
                </Anchor>
            )}
            {pageWindow(current, total).map((page, i) =>
                page === 'gap' ? (
                    <Text key={`gap-${i}`} c="dimmed" px={4} aria-hidden>
                        …
                    </Text>
                ) : page === current ? (
                    <Text key={page} fw={700} px={6} aria-current="page">
                        {page}
                    </Text>
                ) : (
                    <Anchor
                        key={page}
                        component={Link}
                        href={hrefFor(page)}
                        px={6}
                        fz="sm"
                        c="primaryRed"
                        underline="hover"
                    >
                        {page}
                    </Anchor>
                ),
            )}
            {current < total && (
                <Anchor component={Link} href={hrefFor(current + 1)} fz="sm" c="primaryRed" underline="hover">
                    Siguiente →
                </Anchor>
            )}
        </Group>
    );
}
