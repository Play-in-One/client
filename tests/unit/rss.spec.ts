import { test, expect } from '@playwright/test';
import { buildRss, emptyRss, escapeXml } from '../../src/lib/rss';
import type { Post } from '../../src/lib/types';

test.describe('escapeXml', () => {
    test('escapa los cinco caracteres reservados', () => {
        expect(escapeXml(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f');
    });
    test('& va primero: no escapa dos veces', () => {
        expect(escapeXml('<&>')).toBe('&lt;&amp;&gt;');
    });
});

const POST: Post = {
    id: 7, slug: 'oferta-fea', title: 'Ofertas <b> & "más"', category: 'deals',
    description: 'Resumen **claro** del post.', image: '',
    published_date: '2026-09-01T12:00:00Z', updated_at: '2026-09-03T12:00:00Z',
};

test.describe('buildRss', () => {
    const xml = buildRss([POST]);
    test('canal con idioma, atom:link self y lastBuildDate = updated_at más nuevo', () => {
        expect(xml).toContain('<language>es-CL</language>');
        expect(xml).toContain('rel="self"');
        expect(xml).toContain(`<lastBuildDate>${new Date(POST.updated_at!).toUTCString()}</lastBuildDate>`);
    });
    test('el item usa la URL canónica con slug, guid permalink y texto escapado', () => {
        expect(xml).toMatch(/<link>https?:\/\/[^<]+\/blog\/oferta-fea-7<\/link>/);
        expect(xml).toContain('<guid isPermaLink="true">');
        expect(xml).toContain('<title>Ofertas &lt;b&gt; &amp; &quot;más&quot;</title>');
        expect(xml).toContain('<description>Resumen claro del post.</description>');
        expect(xml).toContain('<category>Ofertas</category>');
    });
    test('sin posts es un canal válido y vacío', () => {
        const empty = buildRss([]);
        expect(empty).toBe(emptyRss());
        expect(empty).not.toContain('<item>');
        expect(empty).toContain('<language>es-CL</language>');
    });
});
