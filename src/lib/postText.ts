/* ── Texto plano de un post del blog ─────────────────────────────────────────
 * El cuerpo de un post (`Post.description`) es Markdown. De él salen la meta
 * description, el `description` y el `wordCount` del JSON-LD y el texto de la
 * tarjeta del listado: los tres se leen fuera del render Markdown, así que
 * ninguno puede llevar `**`, `##` ni la URL de un enlace. Módulo puro y sin
 * dependencias para poder importarlo desde Server Components y desde seo.ts.
 */
import type { Post } from './types';

/** Etiqueta visible de cada categoría. El valor crudo (`deals`) es la clave
 *  de la API; publicarlo tal cual en la insignia o en `articleSection` le
 *  hablaba en inglés a un sitio en español. */
export const CATEGORY_LABEL: Record<Post['category'], string> = {
    news: 'Noticias',
    update: 'Actualización',
    deals: 'Ofertas',
    community: 'Comunidad',
    gaming: 'Gaming',
};

interface Block {
    text: string;
    heading: boolean;
}

const HEADING = /^\s{0,3}#{1,6}\s+/;

/** Quita la sintaxis inline de una línea ya sin marcadores de bloque. */
function stripInline(line: string): string {
    return line
        // Imagen antes que enlace: `![alt](url)` también casa con el patrón del
        // enlace y dejaría un "!" suelto. La imagen no aporta texto citable.
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/\*(.+?)\*/g, '$1')
        // `_` solo como énfasis entre límites de palabra: un `snake_case`
        // dentro de una frase no es cursiva.
        .replace(/(^|[^\w])_(.+?)_(?=[^\w]|$)/g, '$1$2');
}

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;

/** Quita los marcadores de bloque: cita, encabezado, viñeta o número. */
function stripBlockMarkers(line: string): string {
    return line
        .replace(/^\s*(>\s?)+/, '')
        .replace(HEADING, '')
        .replace(LIST_ITEM, '');
}

/**
 * Bloques de texto del cuerpo, en orden. Un párrafo termina en una línea
 * vacía; un encabezado ATX es siempre un bloque propio aunque el texto vaya
 * pegado debajo, igual que lo trata Markdown al renderizarlo.
 */
function blocks(md: string): Block[] {
    const out: Block[] = [];
    let current = '';
    // ¿La línea anterior del bloque abrió un ítem de lista (o lo continuó)?
    let inItem = false;
    const flush = () => {
        const text = current.replace(/\s+/g, ' ').trim();
        if (text) out.push({ text, heading: false });
        current = '';
        inItem = false;
    };
    for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
        if (!raw.trim() || /^\s*([-*_])(\s*\1){2,}\s*$/.test(raw)) {
            flush();
            continue;
        }
        const unquoted = raw.replace(/^\s*(>\s?)+/, '');
        const isHeading = HEADING.test(unquoted);
        const text = stripInline(stripBlockMarkers(raw)).trim();
        if (isHeading) {
            flush();
            const clean = text.replace(/\s+/g, ' ').replace(/\s*#+$/, '');
            if (clean) out.push({ text: clean, heading: true });
            continue;
        }
        const isItem = LIST_ITEM.test(unquoted);
        // Dos ítems seguidos van con coma: unidos con un espacio, "- Precios"
        // y "- Ofertas" se leían como la frase "Precios Ofertas" en la meta
        // description. Si el ítem ya cierra con puntuación, basta el espacio.
        // La continuación de un ítem (línea sin viñeta) y la frase que
        // introduce la lista ("Incluye:") se unen con espacio, como siempre.
        const sep = !current ? '' : isItem && inItem && !/[.,;:!?…]$/.test(current) ? ', ' : ' ';
        current += sep + text;
        inItem = isItem || inItem;
    }
    flush();
    return out;
}

/** El cuerpo sin sintaxis Markdown, con un párrafo por bloque. */
export function postPlainText(md: string): string {
    return blocks(md ?? '').map((b) => b.text).join('\n\n');
}

/**
 * Resumen para meta description, JSON-LD y tarjetas: el primer párrafo de
 * texto. Se saltan los encabezados porque "Qué incluye" no resume nada, y solo
 * si el post no tiene otra cosa se usa el primero. Si pasa de `max`, se corta
 * en el último límite de palabra y se cierra con `…` (el total no pasa de
 * `max`): una palabra partida en el snippet de Google parece un error.
 */
export function postExcerpt(md: string, max = 155): string {
    const all = blocks(md ?? '');
    const text = (all.find((b) => !b.heading) ?? all[0])?.text ?? '';
    if (text.length <= max) return text;
    const window = text.slice(0, max);
    const boundary = window.lastIndexOf(' ');
    const cut = boundary > 0 ? window.slice(0, boundary) : text.slice(0, max - 1);
    return `${cut.replace(/[\s,;:.—-]+$/, '')}…`;
}

/** Palabras del texto plano: el `wordCount` del JSON-LD. */
export function postWordCount(md: string): number {
    return postPlainText(md).split(/\s+/).filter(Boolean).length;
}
