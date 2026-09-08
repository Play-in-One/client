import type { Page } from '@playwright/test';

/**
 * Datos sembrados por `manage.py seed_e2e` en el backend de desarrollo.
 *
 * Los tests que dependen del render del SERVIDOR no pueden mockear nada: en dev
 * el navegador pide a `localhost:8001` y el render de Next sale del contenedor
 * hacia `backend:8001` por la red interna de Docker, así que `page.route` —que
 * solo intercepta el navegador— nunca ve ese fetch. Los componentes de cliente
 * tampoco vuelven a pedir: consumen el prop del servidor. Por eso estos specs
 * trabajan contra datos reales, como ya hacían `consent`, `flash` y `tracking`.
 *
 * Antes de correrlos:
 *   docker exec develop-backend-1 python manage.py seed_e2e
 *
 * Los ids son fijos y los fija el comando: un juego sin ofertas no aparece en
 * `/api/games/` —la galería solo lista lo que tiene stock— así que no habría
 * forma de averiguar el suyo sin credenciales de staff.
 */
export const SEEDED = {
    gameId: 999001,
    game: 'E2E Juego De Prueba',
    emptyGameId: 999002,
    emptyGame: 'E2E Juego Sin Stock',
    /** Con oferta pero sin serie: el card del historial enseña su estado vacío,
     *  cosa que el juego sin ofertas no puede hacer —ahí ni se pinta. */
    noHistoryGameId: 999003,
    noHistoryGame: 'E2E Juego Sin Historial',
    nationalSeller: 'E2E Tienda Nacional',
    internationalSeller: 'E2E Importadora',
    /** Nacional, nueva, sin envío: su precio efectivo es el de lista. */
    nationalPrice: 19990,
    /** Importada y usada: 14.990 de lista + 9.990 de envío. */
    internationalListPrice: 14990,
    internationalShipping: 9990,
    internationalEffectivePrice: 24980,
    posts: [
        { title: 'E2E Las mejores ofertas del mes', category: 'deals' },
        { title: 'E2E Nuevo juego anunciado', category: 'news' },
    ],
} as const;

/**
 * La URL canónica de una ficha, `/juego/<slug>-<id>`.
 *
 * El slug se pide a la API en vez de construirlo: `/game/<id>` responde un 308,
 * y un test que fuera ahí leería el cuerpo vacío de la redirección.
 */
export async function seededGamePath(page: Page, id: number = SEEDED.gameId): Promise<string> {
    const res = await page.request.get(`http://localhost:8001/api/games/${id}/`);
    if (!res.ok()) {
        throw new Error(
            `No está el juego ${id}. Corre: docker exec develop-backend-1 python manage.py seed_e2e`,
        );
    }
    const { slug } = await res.json();
    return slug ? `/juego/${slug}-${id}` : `/juego/${id}`;
}

/** El id de un post sembrado, por su título. */
export async function seededPostId(page: Page, title: string): Promise<number> {
    const res = await page.request.get(
        `http://localhost:8001/api/posts/?search=${encodeURIComponent(title)}`,
    );
    const { results } = await res.json();
    const post = results.find((p: { title: string }) => p.title === title);
    if (!post) {
        throw new Error(
            `No está el post "${title}". Corre: docker exec develop-backend-1 python manage.py seed_e2e`,
        );
    }
    return post.id;
}
