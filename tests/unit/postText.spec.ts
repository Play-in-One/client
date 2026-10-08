import { test, expect } from '@playwright/test';
import { CATEGORY_LABEL, postExcerpt, postPlainText, postWordCount } from '../../src/lib/postText';
import { absoluteUrl, articleJsonLd, blogJsonLd, buildMetadata, postPath } from '../../src/lib/seo';
import type { Post } from '../../src/lib/types';
import { parsePostSegment } from '../../src/app/blog/[slug]/resolve';

/* El cuerpo del post es Markdown y alimenta la meta description, el
 * `description` del JSON-LD y la tarjeta del listado: ninguno de los tres
 * puede llevar sintaxis cruda ni cortar una palabra a la mitad. */

const BODY = [
    '## Qué incluye',
    '',
    'Esta guía explica **cómo comparar** precios en [la ficha del juego](/juego/e2e-juego-de-prueba-999001) sin `trucos`.',
    '',
    '- Primer punto',
    '- Segundo _punto_',
    '',
    '> Una cita final ![captura](https://example.com/a.png)',
].join('\n');

test.describe('postPlainText', () => {
    test('quita la sintaxis Markdown y conserva el texto de los enlaces', () => {
        const plain = postPlainText(BODY);
        expect(plain).not.toMatch(/[#*_`>[\]]/);
        expect(plain).toContain('Qué incluye');
        expect(plain).toContain('cómo comparar');
        expect(plain).toContain('la ficha del juego');
        expect(plain).not.toContain('/juego/e2e-juego-de-prueba-999001');
        expect(plain).not.toContain('example.com');
        expect(plain).toContain('Segundo punto');
        expect(plain).toContain('Una cita final');
    });

    test('conserva los saltos de párrafo y colapsa los espacios dentro de cada uno', () => {
        const plain = postPlainText('Uno   dos\ntres\n\n\n\nCuatro');
        expect(plain).toBe('Uno dos tres\n\nCuatro');
    });
});

test.describe('postExcerpt', () => {
    test('devuelve entero un primer párrafo corto', () => {
        expect(postExcerpt('Primer párrafo corto.\n\nSegundo párrafo.')).toBe('Primer párrafo corto.');
    });

    test('salta las líneas vacías y toma el primer párrafo con texto', () => {
        expect(postExcerpt('\n\n**Hola** mundo.\n\nOtro.')).toBe('Hola mundo.');
    });

    test('un encabezado no es el resumen: se toma el primer párrafo de texto', () => {
        expect(postExcerpt(BODY)).toBe(
            'Esta guía explica cómo comparar precios en la ficha del juego sin trucos.',
        );
        expect(postExcerpt('## Solo título\nTexto pegado al título.')).toBe('Texto pegado al título.');
    });

    test('un post que solo tiene encabezados usa el primero', () => {
        expect(postExcerpt('## Uno\n\n## Dos')).toBe('Uno');
    });

    test('corta en un límite de palabra y añade puntos suspensivos', () => {
        const long = 'palabra '.repeat(40).trim();
        const excerpt = postExcerpt(long, 30);
        expect(excerpt.endsWith('…')).toBe(true);
        expect(excerpt.length).toBeLessThanOrEqual(30);
        // Sin palabras cortadas: todo lo que queda antes del … son "palabra".
        expect(excerpt.slice(0, -1).split(' ').every((w) => w === 'palabra')).toBe(true);
    });

    test('el límite por defecto es 155 caracteres', () => {
        const excerpt = postExcerpt('abc '.repeat(100));
        expect(excerpt.length).toBeLessThanOrEqual(155);
        expect(excerpt.endsWith('…')).toBe(true);
    });
});

test('postWordCount cuenta las palabras del texto plano', () => {
    expect(postWordCount('## Título\n\nUno **dos** [tres](/x).\n\n- cuatro')).toBe(5);
    expect(postWordCount('')).toBe(0);
});

test('CATEGORY_LABEL traduce las cinco categorías', () => {
    expect(CATEGORY_LABEL).toEqual({
        news: 'Noticias',
        update: 'Actualización',
        deals: 'Ofertas',
        community: 'Comunidad',
        gaming: 'Gaming',
    });
});

test('postPath usa el slug cuando existe y cae al id sin él', () => {
    expect(postPath({ id: 9, slug: 'mas-info' })).toBe('/blog/mas-info-9');
    expect(postPath({ id: 9 })).toBe('/blog/9');
    expect(postPath({ id: 9, slug: '' })).toBe('/blog/9');
    expect(postPath({ id: 9, slug: null })).toBe('/blog/9');
});

test('parsePostSegment separa slug e id', () => {
    expect(parsePostSegment('mas-info-9')).toEqual({ slug: 'mas-info', id: '9' });
    expect(parsePostSegment('9')).toEqual({ slug: '', id: '9' });
    expect(parsePostSegment('basura')).toBeNull();
    expect(parsePostSegment('9-basura')).toBeNull();
});

/* ── Metadatos y JSON-LD del post ──────────────────────────────────────── */

const POST: Post = {
    id: 9,
    title: 'Más info para los juegos',
    slug: 'mas-info-para-los-juegos',
    category: 'update',
    description: '## Qué incluye\n\nUn **resumen** corto.\n\n- Punto uno\n- Punto dos',
    image: 'https://cdn.example.com/a.png',
    published_date: '2026-10-02T14:03:11-03:00',
    updated_at: '2026-10-05T10:00:00-03:00',
};

test.describe('articleJsonLd', () => {
    test('BlogPosting con resumen, sección, fecha de edición y URL con slug', () => {
        const ld = articleJsonLd(POST);
        expect(ld['@type']).toBe('BlogPosting');
        expect(ld.description).toBe('Un resumen corto.');
        expect(ld.dateModified).toBe(POST.updated_at);
        expect(ld.articleSection).toBe('Actualización');
        expect(ld.wordCount).toBe(postWordCount(POST.description));
        expect(ld.mainEntityOfPage).toBe(absoluteUrl('/blog/mas-info-para-los-juegos-9'));
        expect(ld.image).toBe(POST.image);
        expect((ld.publisher as { logo: { url: string } }).logo.url).toBe(absoluteUrl('/PIO.png'));
    });

    test('NewsArticle para noticias y dateModified cae a la publicación sin updated_at', () => {
        const ld = articleJsonLd({ ...POST, category: 'news', updated_at: undefined });
        expect(ld['@type']).toBe('NewsArticle');
        expect(ld.dateModified).toBe(POST.published_date);
    });
});

test('blogJsonLd lista los posts con su URL canónica', () => {
    const ld = blogJsonLd([POST, { ...POST, id: 10, slug: undefined, category: 'news' }]);
    expect(ld['@type']).toBe('Blog');
    expect(ld.name).toBe('Blog de Play in One');
    expect(ld.url).toBe(absoluteUrl('/blog'));
    const items = ld.blogPost as Record<string, unknown>[];
    expect(items.map((p) => p['@type'])).toEqual(['BlogPosting', 'NewsArticle']);
    expect(items.map((p) => p.url)).toEqual([
        absoluteUrl('/blog/mas-info-para-los-juegos-9'),
        absoluteUrl('/blog/10'),
    ]);
    expect(items[0].dateModified).toBe(POST.updated_at);
    expect(items[0].headline).toBe(POST.title);
});

test.describe('buildMetadata', () => {
    test('un artículo publica modifiedTime y section en Open Graph', () => {
        const meta = buildMetadata({
            title: 'X', path: '/blog/x-1', type: 'article',
            publishedTime: 'a', modifiedTime: 'b', section: 'Ofertas',
        });
        expect(meta.openGraph).toMatchObject({ publishedTime: 'a', modifiedTime: 'b', section: 'Ofertas' });
    });

    test('fuera de un artículo no se emiten', () => {
        const meta = buildMetadata({ title: 'X', modifiedTime: 'b', section: 'Ofertas' });
        expect(meta.openGraph).not.toHaveProperty('modifiedTime');
        expect(meta.openGraph).not.toHaveProperty('section');
    });

    test('absoluteTitle salta la plantilla "%s | Play in One" del layout', () => {
        const meta = buildMetadata({ title: 'Post | Blog de Play in One', absoluteTitle: true });
        expect(meta.title).toEqual({ absolute: 'Post | Blog de Play in One' });
        expect(meta.openGraph?.title).toBe('Post | Blog de Play in One');
    });
});
