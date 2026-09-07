/* ── SEO / GEO single source of truth ──────────────────────────────────────
 * Helpers for metadata + schema.org JSON-LD. Kept framework-light so it can be
 * imported from Server Components, generateMetadata(), sitemap.ts and robots.ts.
 */
import type { Metadata } from 'next';
import type { Game, Platform, Post, Product, Seller } from './types';
import { formatCLP } from './utils';

/** Public site origin. Configure NEXT_PUBLIC_SITE_URL at deploy time. */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
).replace(/\/+$/, '');

export const siteConfig = {
    name: 'Play in One',
    shortName: 'PIO',
    title: 'Play in One — Comparador de Precios de Videojuegos en Chile',
    description:
        'Compara precios en tiempo real entre decenas de tiendas chilenas. Encuentra tu próximo videojuego al mejor precio.',
    locale: 'es_CL',
    lang: 'es-CL',
    keywords: [
        'comparador de precios videojuegos',
        'precios videojuegos Chile',
        'ofertas videojuegos',
        'PS5', 'Xbox', 'Nintendo Switch', 'PC',
        'juegos baratos Chile',
        'Play in One',
    ],
    social: {
        instagram: 'https://www.instagram.com/playinone.cl/',
        linkedin: 'https://www.linkedin.com/company/playinonecl/',
        facebook: 'https://www.facebook.com/people/Play-in-One/61586254222483/',
        twitter: 'https://x.com/playinonecl',
        youtube: 'https://www.youtube.com/@PlayinOne-cl',
        reddit: 'https://www.reddit.com/user/playinonecl/',
        tiktok: 'https://www.tiktok.com/@playinone.cl',
        pinterest: 'https://cl.pinterest.com/playinone/',
        gmail: 'mailto:pl4y1n0ne@gmail.com',
        discord: 'https://discord.gg/tuDjFGZnEF',
        spotify: 'https://open.spotify.com/',
        whatsapp: 'https://wa.me/',
        threads: 'https://www.threads.com/@playinone.cl',
        tumblr: 'https://www.tumblr.com/blog/playinone-cl',
        telegram: 'https://t.me/playinonecl',
    },
} as const;

/** Absolute URL from a site-relative path (or a passthrough if already absolute). */
/**
 * Ruta de la ficha de un juego: `/juego/<slug>-<id>` (+ `?platform=` si la
 * vista sabe desde qué consola se llega). El id es lo único que resuelve; el
 * slug lo deriva el backend del nombre y, si no cuadra, la ruta corrige con
 * un 308. Sin slug (backend anterior al campo) se emite `/juego/<id>`, que
 * también redirige a la canónica: un deploy a medias no publica URLs rotas.
 *
 * Único constructor de esta URL en el cliente: la ruta antigua `/game/<id>`
 * solo existe ya como redirección permanente.
 */
export function gamePath(
    game: { id: number; slug?: string | null },
    platformSlug?: string | null,
): string {
    const segment = game.slug ? `${game.slug}-${game.id}` : String(game.id);
    return `/juego/${segment}${platformSlug ? `?platform=${platformSlug}` : ''}`;
}

export function absoluteUrl(path = '/'): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

interface BuildMetadataArgs {
    title?: string;
    description?: string | null;
    /** Site-relative path, used for the canonical URL and og:url. */
    path?: string;
    /** Absolute image URL (e.g. a game cover). Falls back to the file-based OG image. */
    image?: string | null;
    type?: 'website' | 'article';
    /** Exclude from search indexes (search result variants, per-user pages). */
    noIndex?: boolean;
    /** ISO date for article types. */
    publishedTime?: string;
}

/**
 * Builds a consistent Metadata object (canonical + Open Graph + Twitter).
 * When `image` is omitted, the file-based opengraph-image is used automatically.
 */
export function buildMetadata({
    title,
    description,
    path = '/',
    image,
    type = 'website',
    noIndex,
    publishedTime,
}: BuildMetadataArgs = {}): Metadata {
    const url = absoluteUrl(path);
    const desc = description ?? siteConfig.description;
    const images = image ? [{ url: image }] : undefined;

    return {
        title,
        description: desc,
        alternates: { canonical: url },
        ...(noIndex ? { robots: { index: false, follow: true } } : {}),
        openGraph: {
            type,
            url,
            siteName: siteConfig.name,
            locale: siteConfig.locale,
            title: title ?? siteConfig.title,
            description: desc,
            ...(images ? { images } : {}),
            ...(type === 'article' && publishedTime ? { publishedTime } : {}),
        },
        twitter: {
            card: 'summary_large_image',
            title: title ?? siteConfig.title,
            description: desc,
            ...(images ? { images } : {}),
        },
    };
}

/* ── JSON-LD (schema.org) builders ─────────────────────────────────────────
 * Each returns a plain object; render it with <JsonLd data={...} />.
 */
export type JsonLdObject = Record<string, unknown>;

export function organizationJsonLd(): JsonLdObject {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteConfig.name,
        url: SITE_URL,
        logo: absoluteUrl('/PIO-punto-negro.svg'),
        description: siteConfig.description,
        sameAs: [
            siteConfig.social.instagram,
            siteConfig.social.linkedin,
            siteConfig.social.facebook,
            siteConfig.social.twitter,
            siteConfig.social.youtube,
            siteConfig.social.reddit,
        ],
    };
}

export function websiteJsonLd(): JsonLdObject {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        url: SITE_URL,
        inLanguage: siteConfig.lang,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

function conditionToSchema(condition: string): string {
    switch (condition) {
        case 'used':
            return 'https://schema.org/UsedCondition';
        // La familia digital entera va explícita, aunque el default diría lo
        // mismo: una descarga se vende nueva. Depender del default hacía que el
        // dato estructurado fuera correcto por accidente, y el siguiente que
        // cambiara el fallback lo rompería sin enterarse.
        case 'new':
        case 'digital':
        case 'store':
        case 'key':
        case 'download':
        default:
            return 'https://schema.org/NewCondition';
    }
}

const num = (value: string | null | undefined): number | null => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** Precio de lista, en el formato que schema.org espera (sin separadores). */
const money = (value: string | null | undefined): string | undefined => {
    const n = num(value);
    return n == null ? undefined : n.toFixed(2);
};

/**
 * Ventana de validez que se le atribuye a un precio.
 *
 * Se cuenta desde HOY, no desde `price_updated_at`. La diferencia importa:
 * PriceHistory solo escribe una fila cuando el precio CAMBIA, así que
 * `price_updated_at` es la fecha del último cambio, no la de la última
 * comprobación. Un juego cuyo precio lleva dos meses quieto se verifica igual
 * todos los días; fechar su validez en aquel cambio + 7 días publicaba un
 * `priceValidUntil` ya vencido, que para Google equivale a una oferta caducada
 * — peor que no declarar nada.
 *
 * Una semana es lo que el sitio puede sostener: el catálogo se revisa a diario.
 */
const PRICE_VALID_DAYS = 7;

function priceValidUntil(): string {
    const until = new Date();
    until.setDate(until.getDate() + PRICE_VALID_DAYS);
    return until.toISOString().slice(0, 10);
}

/**
 * Una oferta concreta de una tienda.
 *
 * `price` es el precio de LISTA y el envío viaja aparte en `shippingDetails`,
 * aunque toda la UI de PIO muestre el efectivo (lista + envío). Emitir el
 * efectivo *y además* el envío lo cobraría dos veces; emitirlo sin
 * `shippingDetails` haría creer que el despacho es gratis. Separarlos es la
 * única lectura en la que el total que deduce un buscador coincide con la
 * cifra que ve una persona en la página.
 */
export function offerJsonLd(product: Product, game: Game): JsonLdObject {
    const shipping = num(product.shipping_cost) ?? 0;
    return {
        '@type': 'Offer',
        '@id': absoluteUrl(`${gamePath(game)}#offer-${product.id}`),
        name: `${game.name} — ${product.seller.name}`,
        price: money(product.base_price),
        priceCurrency: 'CLP',
        itemCondition: conditionToSchema(product.condition),
        // El API público excluye las ofertas sin stock, así que todo lo que
        // llega hasta aquí está efectivamente disponible.
        availability: 'https://schema.org/InStock',
        url: product.url,
        priceValidUntil: priceValidUntil(),
        seller: {
            '@type': 'Organization',
            name: product.seller.name,
            url: absoluteUrl(`/store/${product.seller.id}`),
            ...(product.seller.url ? { sameAs: product.seller.url } : {}),
        },
        shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
                '@type': 'MonetaryAmount',
                value: shipping.toFixed(2),
                currency: 'CLP',
            },
            shippingDestination: {
                '@type': 'DefinedRegion',
                addressCountry: 'CL',
            },
        },
    };
}

/** Product + AggregateOffer for a game detail page. */
export function gameJsonLd(game: Game): JsonLdObject {
    // Ordenadas por precio EFECTIVO, el mismo criterio con el que PIO elige la
    // mejor oferta. El backend ya las manda así; reordenar aquí mantiene el
    // invariante aunque este builder reciba una lista de otra procedencia.
    const offers = [...(game.products ?? [])]
        .filter((p) => p.base_price != null)
        .sort((a, b) => (num(a.current_price) ?? Infinity) - (num(b.current_price) ?? Infinity));
    const listPrices = offers.map((p) => num(p.base_price)).filter((n): n is number => n != null);

    const data: JsonLdObject = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': absoluteUrl(`${gamePath(game)}#product`),
        name: game.name,
        url: absoluteUrl(gamePath(game)),
        category: 'VideoGame',
        ...(game.image ? { image: game.image } : {}),
        ...(game.description ? { description: game.description } : {}),
        ...(game.developer ? { brand: { '@type': 'Brand', name: game.developer } } : {}),
        ...(game.platforms?.length
            ? { gamePlatform: game.platforms.map((p) => p.display_name) }
            : {}),
        ...(game.genres?.length ? { genre: game.genres.map((g) => g.name) } : {}),
        ...(game.release_date ? { releaseDate: game.release_date } : {}),
    };

    // Sin ofertas no se fabrica un AggregateOffer vacío: un Product que
    // declara tener precio y no lo trae es peor que uno que no lo declara.
    if (listPrices.length > 0) {
        data.offers = {
            '@type': 'AggregateOffer',
            priceCurrency: 'CLP',
            lowPrice: Math.min(...listPrices).toFixed(2),
            highPrice: Math.max(...listPrices).toFixed(2),
            offerCount: offers.length,
            offers: offers.map((p) => offerJsonLd(p, game)),
        };
    }

    // Sin `aggregateRating` a propósito. `game.rating` es una nota editorial,
    // no el promedio de reseñas de nadie, y Google exige `ratingCount` o
    // `reviewCount` con esa semántica: publicar el número de ofertas como si
    // fuera un conteo de reseñas es un dato inventado en el campo que más
    // vigilan las acciones manuales por datos estructurados. Si algún día hay
    // reseñas reales, aquí va el bloque con su conteo verdadero.

    return data;
}

/* ── GEO: la frase que un motor generativo puede citar ─────────────────────
 * Vive aquí, y no en cada página, para que el texto sea EL MISMO en el HTML,
 * en la meta description, en la FAQ y en llms.txt. Una respuesta citada tiene
 * que poder verificarse contra la página que la respalda.
 */

/** Convierte un ISO a "31 de agosto de 2026". */
function formatDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('es-CL', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
    }).format(date);
}

interface BestPriceOptions {
    /** Consola a la que se acota la frase, si la vista tiene una activa. */
    platform?: Platform | null;
    /** Precio y tienda ya resueltos por la vista (respetando sus filtros).
     *  Sin esto se usan los del juego, que son los del catálogo completo. */
    price?: string | number | null;
    sellerName?: string | null;
    /** Envío incluido en `price`. Decide si la frase dice "con envío incluido". */
    shipping?: string | number | null;
    offerCount?: number;
    sellerCount?: number;
}

/**
 * "El precio más barato de X para PS5 es $29.990 en Zmart, con envío incluido.
 *  Comparamos 7 ofertas de 5 tiendas chilenas; precio actualizado el 31 de
 *  agosto de 2026."
 *
 * Degrada por partes: sin tienda conocida omite el "en …", sin ofertas
 * devuelve null, sin fecha se queda en la primera frase.
 */
export function bestPriceSentence(game: Game, opts: BestPriceOptions = {}): string | null {
    const price = opts.price ?? game.min_price;
    if (price == null || price === '') return null;

    const sellerName = opts.sellerName ?? game.min_price_seller?.name ?? null;
    const shipping = num(String(opts.shipping ?? game.min_price_shipping ?? '0')) ?? 0;
    const platform = opts.platform ? ` para ${opts.platform.display_name}` : '';
    const where = sellerName ? ` en ${sellerName}` : '';
    const withShipping = shipping > 0 ? ', con envío incluido' : '';

    let text = `El precio más barato de ${game.name}${platform} es ${formatCLP(price)}${where}${withShipping}.`;

    const offerCount = opts.offerCount ?? game.products?.length ?? 0;
    const sellerCount =
        opts.sellerCount ??
        (game.products ? new Set(game.products.map((p) => p.seller.id)).size : 0);
    if (offerCount > 0) {
        const offerLabel = offerCount === 1 ? '1 oferta' : `${offerCount} ofertas`;
        const sellerLabel = sellerCount === 1 ? '1 tienda chilena' : `${sellerCount} tiendas chilenas`;
        text += ` Comparamos ${offerLabel} de ${sellerLabel}`;
        // "sin cambios desde", no "actualizado el": el historial solo registra
        // cambios de precio, así que esa fecha es la del último movimiento y no
        // la de la última revisión (que es diaria). Decir "actualizado el 30 de
        // junio" hacía parecer abandonado un precio verificado esta mañana.
        const since = formatDate(game.price_updated_at);
        text += since ? `; precio sin cambios desde el ${since}.` : '.';
    }

    return text;
}

/* ── Listados y colecciones ────────────────────────────────────────────── */

/**
 * ItemList de juegos. Cada entrada lleva su precio y su tienda: es lo que
 * convierte un listado en una respuesta ("los PS5 más baratos son…") en vez
 * de en una lista de enlaces.
 */
export function itemListJsonLd(
    games: Game[],
    { path, name }: { path: string; name: string },
): JsonLdObject {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        url: absoluteUrl(path),
        numberOfItems: games.length,
        itemListElement: games.map((game, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Product',
                '@id': absoluteUrl(`${gamePath(game)}#product`),
                name: game.name,
                url: absoluteUrl(gamePath(game)),
                ...(game.image ? { image: game.image } : {}),
                ...(game.min_price_base
                    ? {
                        offers: {
                            '@type': 'AggregateOffer',
                            priceCurrency: 'CLP',
                            lowPrice: money(game.min_price_base),
                            ...(game.min_price_seller
                                ? {
                                    seller: {
                                        '@type': 'Organization',
                                        name: game.min_price_seller.name,
                                        url: absoluteUrl(`/store/${game.min_price_seller.id}`),
                                    },
                                }
                                : {}),
                        },
                    }
                    : {}),
            },
        })),
    };
}

export function collectionPageJsonLd({
    name,
    description,
    path,
}: {
    name: string;
    description: string;
    path: string;
}): JsonLdObject {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        description,
        url: absoluteUrl(path),
        inLanguage: siteConfig.lang,
        isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: SITE_URL },
    };
}

export interface FaqEntry {
    question: string;
    answer: string;
}

/**
 * FAQPage. Google ya casi no pinta el rich result, pero sigue siendo la forma
 * más directa de darle a un motor generativo un par pregunta/respuesta que
 * puede citar entero.
 */
export function faqJsonLd(entries: FaqEntry[], path?: string): JsonLdObject {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        ...(path ? { '@id': `${absoluteUrl(path)}#faq` } : {}),
        inLanguage: siteConfig.lang,
        mainEntity: entries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
    };
}

/** Article / NewsArticle for a blog post. */
export function articleJsonLd(post: Post): JsonLdObject {
    return {
        '@context': 'https://schema.org',
        '@type': post.category === 'news' ? 'NewsArticle' : 'Article',
        headline: post.title,
        description: post.description,
        ...(post.image ? { image: post.image } : {}),
        datePublished: post.published_date,
        dateModified: post.published_date,
        inLanguage: siteConfig.lang,
        mainEntityOfPage: absoluteUrl(`/blog/${post.id}`),
        author: { '@type': 'Organization', name: siteConfig.name },
        publisher: {
            '@type': 'Organization',
            name: siteConfig.name,
            logo: { '@type': 'ImageObject', url: absoluteUrl('/PIO-punto-negro.svg') },
        },
    };
}

export function storeJsonLd(seller: Seller): JsonLdObject {
    // `addresses` solo viaja en el detalle de la tienda, y hasta ahora se
    // ignoraba: una dirección física es justo lo que distingue a una tienda
    // real de un dominio cualquiera, tanto para el buscador local como para un
    // motor generativo al que le preguntan "¿dónde la compro en Santiago?".
    const addresses = seller.addresses ?? [];
    return {
        '@context': 'https://schema.org',
        '@type': 'Store',
        '@id': absoluteUrl(`/store/${seller.id}#store`),
        name: seller.name,
        url: absoluteUrl(`/store/${seller.id}`),
        ...(seller.logo ? { logo: seller.logo, image: seller.logo } : {}),
        ...(seller.description ? { description: seller.description } : {}),
        ...(seller.url ? { sameAs: [seller.url] } : {}),
        ...(addresses.length
            ? {
                address: addresses.map((a) => ({
                    '@type': 'PostalAddress',
                    streetAddress: a.address,
                    addressCountry: 'CL',
                    ...(a.label ? { name: a.label } : {}),
                })),
            }
            : {}),
        // Una importadora despacha a Chile pero no opera desde Chile: la
        // distinción es la misma que la insignia 🌐 de la UI.
        areaServed: { '@type': 'Country', name: 'Chile' },
    };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLdObject {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: it.name,
            item: absoluteUrl(it.path),
        })),
    };
}
