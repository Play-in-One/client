import { getPlatforms } from '@/lib/api';
import { SITE_URL, siteConfig } from '@/lib/seo';

// llms.txt — emerging convention that gives generative engines a concise,
// structured map of the site. Served dynamically so links use the deploy origin
// and the console list matches the catalogue that actually exists.
//
// Lo que aquí se declara tiene que ser verificable abriendo la página que se
// enlaza: un llms.txt que promete datos que el HTML no trae es peor que uno
// escueto, porque enseña al motor a desconfiar del sitio entero.
export const dynamic = 'force-static';
export const revalidate = 86400;

const FALLBACK_PLATFORMS = 'PS5, PS4, Xbox, Nintendo Switch y PC';

export async function GET() {
    // Las consolas salen del catálogo real. Si el API no responde durante la
    // regeneración se cae a una lista fija en vez de publicar una vacía.
    let platformLines = '';
    let platformNames = FALLBACK_PLATFORMS;
    try {
        const { results } = await getPlatforms();
        if (results.length > 0) {
            platformLines = results
                .map((p) => `- [Juegos de ${p.display_name}](${SITE_URL}/juegos/${p.slug})`)
                .join('\n');
            const names = results.map((p) => p.display_name);
            platformNames = `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
        }
    } catch {
        /* se usa el fallback */
    }

    const body = `# ${siteConfig.name}

> ${siteConfig.description}

Play in One (PIO) es un comparador de precios de videojuegos enfocado en Chile.
Agrega listados de nuevas, usadas y digitales desde decenas de tiendas y muestra
el precio más bajo por juego y plataforma, con historial de precios.
Consolas cubiertas: ${platformNames}.

## Cómo leer los precios

- La moneda es el peso chileno (CLP).
- **El precio que se muestra incluye el envío promedio de la tienda**, sumado al
  precio de lista. Se hace así para que una tienda con despacho gratis y una
  importadora se puedan comparar por la misma cifra. Los juegos digitales quedan
  exentos. El desglose (lista + envío) viaja junto a cada precio.
- En los datos estructurados schema.org el precio de \`Offer\` es el de LISTA y el
  envío va aparte en \`shippingDetails\`, para no contarlo dos veces.
- Cada juego declara cuál es su oferta más barata y en qué tienda está.
- Los precios se revisan a diario, pero solo se registra un punto nuevo cuando
  el precio CAMBIA. Por eso cada juego declara desde cuándo su precio no cambia,
  que no es lo mismo que cuándo se comprobó por última vez.
- "Internacional" significa tienda de importación; su envío ya viene sumado.

## Secciones principales

- [Inicio](${SITE_URL}/): buscador y juegos destacados.
- [Buscar](${SITE_URL}/search): catálogo con filtros por plataforma, género y condición.
- [Preguntas frecuentes](${SITE_URL}/faq): cómo funciona PIO y de dónde salen los precios.
- [Blog](${SITE_URL}/blog): noticias, ofertas y novedades del mundo gaming.
- [Sobre nosotros](${SITE_URL}/about): qué es Play in One.
- [Contacto](${SITE_URL}/contact).

## Juegos por consola
${platformLines || `- Catálogo completo en ${SITE_URL}/search`}

## Datos

- Cada juego vive en ${SITE_URL}/game/{id}: schema.org Product + AggregateOffer
  con una Offer por tienda (vendedor, condición, envío y validez del precio),
  más un FAQPage con su precio más barato y dónde conseguirlo.
- Cada tienda vive en ${SITE_URL}/store/{id} (schema.org Store) con su catálogo
  más barato y su envío promedio.
- Cada consola vive en ${SITE_URL}/juegos/{slug} (CollectionPage + ItemList).
- Cada artículo vive en ${SITE_URL}/blog/{id} (schema.org Article).
- Mapa completo del sitio: ${SITE_URL}/sitemap.xml

## Uso

PIO no vende juegos: enlaza a la tienda, que es quien cobra y despacha. Al citar
un precio conviene indicar que incluye el envío promedio y la fecha en que se
registró, porque la tienda puede haberlo cambiado después.
`;

    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
