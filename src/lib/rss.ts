/* ── Feed RSS 2.0 del blog ───────────────────────────────────────────────────
 * Módulo puro (sin fetch) para poder probarlo sin servidor; la ruta
 * `app/blog/rss.xml/route.ts` solo trae los posts y lo invoca.
 */
import type { Post } from './types';
import { CATEGORY_LABEL, postExcerpt } from './postText';
import { absoluteUrl, postPath } from './seo';

export const FEED_TITLE = 'Blog de Play in One';
export const FEED_PATH = '/blog/rss.xml';
export const FEED_DESCRIPTION =
    'Noticias, ofertas y novedades del mundo gaming en Chile. Mantente al día con lo último de Play in One.';

/** Escapa un nodo de texto XML. `&` va primero para no escapar dos veces. */
export function escapeXml(text: string): string {
    // XML 1.0 prohíbe estos caracteres de control (un título pegado desde un
    // editor puede traerlos) y un solo \x0B invalida todo el feed.
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function rfc822(iso: string | undefined): string | null {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toUTCString() : null;
}

function wrap(inner: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(FEED_TITLE)}</title>
<link>${escapeXml(absoluteUrl('/blog'))}</link>
<description>${escapeXml(FEED_DESCRIPTION)}</description>
<language>es-CL</language>
<atom:link href="${escapeXml(absoluteUrl(FEED_PATH))}" rel="self" type="application/rss+xml"/>
${inner}</channel>
</rss>
`;
}

/** Canal válido sin items: lo que se sirve si la API falla (un 500 en un feed
 *  hace que los lectores lo den por roto y dejen de consultarlo). */
export function emptyRss(): string {
    return wrap('');
}

export function buildRss(posts: Post[]): string {
    if (posts.length === 0) return emptyRss();
    // Un post corregido empuja el `lastBuildDate`: los lectores comparan esa
    // fecha para decidir si re-descargan el feed.
    const newest = posts
        .map((p) => new Date(p.updated_at ?? p.published_date).getTime())
        .filter((t) => !Number.isNaN(t))
        .reduce((a, b) => Math.max(a, b), 0);
    const items = posts
        .map((p) => {
            const url = escapeXml(absoluteUrl(postPath(p)));
            const pub = rfc822(p.published_date);
            return `<item>
<title>${escapeXml(p.title)}</title>
<link>${url}</link>
<guid isPermaLink="false">playinone-post-${p.id}</guid>
${pub ? `<pubDate>${pub}</pubDate>\n` : ''}<description>${escapeXml(postExcerpt(p.description))}</description>
<category>${escapeXml(CATEGORY_LABEL[p.category] ?? p.category)}</category>
</item>
`;
        })
        .join('');
    const build = newest ? `<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>\n` : '';
    return wrap(build + items);
}
