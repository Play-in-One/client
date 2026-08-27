/* ── SEO / GEO single source of truth ──────────────────────────────────────
 * Helpers for metadata + schema.org JSON-LD. Kept framework-light so it can be
 * imported from Server Components, generateMetadata(), sitemap.ts and robots.ts.
 */
import type { Metadata } from 'next';
import type { Game, Post, Seller } from './types';

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
        /** Cuenta real pendiente de creación — link genérico como placeholder. */
        tiktok: 'https://tiktok.com/',
        /** Cuentas/enlaces reales pendientes de creación — placeholders genéricos. */
        pinterest: 'https://www.pinterest.com/',
        gmail: 'mailto:pl4y1n0ne@gmail.com',
        discord: 'https://discord.gg/tuDjFGZnEF',
        spotify: 'https://open.spotify.com/',
        whatsapp: 'https://wa.me/',
        threads: 'https://www.threads.net/',
        tumblr: 'https://www.tumblr.com/',
        telegram: 'https://t.me/',
    },
} as const;

/** Absolute URL from a site-relative path (or a passthrough if already absolute). */
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
        case 'new':
        case 'digital':
        default:
            return 'https://schema.org/NewCondition';
    }
}

/** Product + AggregateOffer for a game detail page. */
export function gameJsonLd(game: Game): JsonLdObject {
    const offers = (game.products ?? []).filter((p) => p.current_price != null);
    const prices = offers
        .map((p) => Number(p.current_price))
        .filter((n) => Number.isFinite(n));
    const lowPrice =
        game.min_price ?? (prices.length ? String(Math.min(...prices)) : undefined);

    const data: JsonLdObject = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: game.name,
        url: absoluteUrl(`/game/${game.id}`),
        category: 'VideoGame',
        ...(game.image ? { image: game.image } : {}),
        ...(game.description ? { description: game.description } : {}),
        ...(game.developer ? { brand: { '@type': 'Brand', name: game.developer } } : {}),
    };

    // Solo se emiten offers cuando hay productos reales: el API público ya
    // excluye los ocultos (out of stock), así que cada oferta emitida está
    // efectivamente disponible y el InStock es veraz. Sin ofertas, no se
    // fabrica un AggregateOffer.
    if (lowPrice != null && offers.length > 0) {
        data.offers = {
            '@type': 'AggregateOffer',
            priceCurrency: 'CLP',
            lowPrice,
            ...(prices.length ? { highPrice: String(Math.max(...prices)) } : {}),
            offerCount: offers.length,
            offers: offers.map((p) => ({
                '@type': 'Offer',
                price: p.current_price,
                priceCurrency: 'CLP',
                itemCondition: conditionToSchema(p.condition),
                availability: 'https://schema.org/InStock',
                url: p.url,
                seller: { '@type': 'Organization', name: p.seller.name },
            })),
        };
    }

    const rating = game.rating != null ? Number(game.rating) : NaN;
    if (Number.isFinite(rating) && rating > 0) {
        data.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: game.rating,
            bestRating: '10',
            worstRating: '0',
            ratingCount: offers.length || 1,
        };
    }

    return data;
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
    return {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: seller.name,
        url: absoluteUrl(`/store/${seller.id}`),
        ...(seller.logo ? { logo: seller.logo, image: seller.logo } : {}),
        ...(seller.description ? { description: seller.description } : {}),
        ...(seller.url ? { sameAs: [seller.url] } : {}),
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
