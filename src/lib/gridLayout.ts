import type { SimpleGridProps } from '@mantine/core';

/**
 * Las grillas de tarjetas de juego, en UN solo lugar.
 *
 * Cada grilla tiene al menos dos versiones que se reemplazan en pantalla: la
 * del servidor y la interactiva, o el esqueleto y la real. Cuando cada una
 * escribía sus `cols`/`spacing` a mano acabaron siendo cuatro variantes, y el
 * reemplazo movía la página entera (otro hueco vertical, otra columna). Una
 * grilla nueva importa una de estas; su esqueleto, la misma.
 */
export type GridLayout = Pick<SimpleGridProps, 'cols' | 'spacing' | 'verticalSpacing'>;

/** Galerías del catálogo: `/search`, landings de consola, sagas, `/ofertas`. */
export const CATALOG_GRID = {
    cols: { base: 2, xs: 2, sm: 2, md: 3 },
    spacing: { base: 'xs', xs: 'lg' },
} as const satisfies GridLayout;

/** Las mismas galerías con tarjetas de oferta, que llevan una línea más de
 *  rebaja y necesitan aire entre filas. */
export const CATALOG_DEALS_GRID = { ...CATALOG_GRID, verticalSpacing: 'xl' } as const satisfies GridLayout;

/** Estantes de cuatro columnas: Populares de la home y relacionados de la ficha. */
export const SHELF_GRID = {
    cols: { base: 2, xs: 2, md: 4 },
    spacing: { base: 'xs', xs: 'lg' },
} as const satisfies GridLayout;

/** Ofertas del día en la home. */
export const SHELF_DEALS_GRID = { ...SHELF_GRID, verticalSpacing: 'xl' } as const satisfies GridLayout;
