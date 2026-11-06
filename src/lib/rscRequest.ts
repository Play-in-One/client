/**
 * Marca que el middleware pone en las peticiones RSC (el prefetch de un
 * `<Link>` y la navegación del cliente) para que el render del servidor las
 * distinga de un documento.
 *
 * Hace falta porque `headers()` de un Server Component nunca ve `rsc` ni
 * `next-router-*`: Next las borra antes del render (`FLIGHT_HEADERS` en
 * `request-store`). El matcher del middleware sí las ve, así que solo él puede
 * decir qué petición es RSC.
 *
 * Sin dependencias a propósito: lo importa el middleware, que corre en edge.
 */
export const RSC_REQUEST_HEADER = 'x-pio-rsc';
