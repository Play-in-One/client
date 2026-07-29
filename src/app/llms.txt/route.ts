import { SITE_URL, siteConfig } from '@/lib/seo';

// llms.txt — emerging convention that gives generative engines a concise,
// structured map of the site. Served dynamically so links use the deploy origin.
export const dynamic = 'force-static';
export const revalidate = 86400;

export function GET() {
    const body = `# ${siteConfig.name}

> ${siteConfig.description}

Play in One (PIO) es un comparador de precios de videojuegos enfocado en Chile.
Agrega listados de nuevas, usadas y digitales desde decenas de tiendas y muestra
el precio más bajo por juego y plataforma (PS5, PS4, Xbox, Nintendo Switch, PC y más),
con historial de precios.

## Secciones principales

- [Inicio](${SITE_URL}/): buscador y juegos destacados.
- [Buscar](${SITE_URL}/search): catálogo con filtros por plataforma, género, tienda y condición.
- [Blog](${SITE_URL}/blog): noticias, ofertas y novedades del mundo gaming.
- [Sobre nosotros](${SITE_URL}/about): qué es Play in One.
- [Contacto](${SITE_URL}/contact).

## Datos

- Cada juego vive en ${SITE_URL}/game/{id} con datos estructurados schema.org (Product + AggregateOffer).
- Cada artículo vive en ${SITE_URL}/blog/{id} (schema.org Article).
- Mapa completo del sitio: ${SITE_URL}/sitemap.xml
- Moneda de los precios: CLP (peso chileno).
`;

    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
