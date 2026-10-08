import type { Genre } from './types';

/** URL de la lista de juegos de un género, opcionalmente acotada a una consola.
 *  Hoy es `/search?genre=<id>` (`noindex`, pero rastreable); cuando exista la
 *  landing `/genero/<slug>` el cambio vive solo aquí, porque los badges de la
 *  ficha y su sección de relacionados la piden a esta función y no arman la
 *  URL por su cuenta. */
export function genreHref(genre: Pick<Genre, 'id' | 'slug'>, platformSlug?: string): string {
    const platform = platformSlug ? `&platform=${encodeURIComponent(platformSlug)}` : '';
    return `/search?genre=${genre.id}${platform}`;
}
