import { test, expect } from '@playwright/test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MantineProvider } from '@mantine/core';

/* El cuerpo del post se renderiza en el servidor con `PostBody`: lo que sale
 * aquí es lo que leen los crawlers de IA, que no ejecutan JS. Se comprueba
 * el HTML estático, no el DOM de un navegador.
 *
 * El runner de Playwright compila TODO `.tsx` con su propio runtime JSX
 * (`playwright/jsx-runtime`), que produce los objetos `{__pw_type: 'jsx'}`
 * del component testing en vez de elementos de React, y `renderToStaticMarkup`
 * los rechaza. Se sustituye ese módulo por el runtime de React ANTES de cargar
 * el componente; por eso `PostBody` entra con `require` y no con `import`
 * (los `import` se elevan por encima de este parche). */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- ver arriba.
require('playwright/jsx-runtime');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- ver arriba.
require.cache[require.resolve('playwright/jsx-runtime')]!.exports = require('react/jsx-runtime');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- ver arriba.
const PostBody: ComponentType<{ markdown: string }> = require('../../src/components/PostBody').default;

function html(markdown: string): string {
    return renderToStaticMarkup(
        createElement(MantineProvider, null, createElement(PostBody, { markdown })),
    );
}

test('## es un <h2> y un # también: el único <h1> es el título del post', () => {
    const out = html('# Grande\n\n## Qué incluye\n\n### Detalle');
    expect(out).not.toMatch(/<h1[\s>]/);
    expect(out).toMatch(/<h2[^>]*>Grande<\/h2>/);
    expect(out).toMatch(/<h2[^>]*>Qué incluye<\/h2>/);
    expect(out).toMatch(/<h3[^>]*>Detalle<\/h3>/);
});

test('listas, negrita y párrafos', () => {
    const out = html('Texto con **negrita**.\n\n- Uno\n- Dos\n\n1. Primero');
    expect(out).toMatch(/<strong>negrita<\/strong>/);
    expect(out).toMatch(/<ul[^>]*>\s*<li>Uno<\/li>\s*<li>Dos<\/li>\s*<\/ul>/);
    expect(out).toMatch(/<ol[^>]*>\s*<li>Primero<\/li>\s*<\/ol>/);
});

test('un salto simple es <br> y una línea en blanco abre otro párrafo', () => {
    const out = html('Línea uno\nLínea dos\n\nOtro párrafo');
    expect(out).toMatch(/Línea uno<br\/>\s*Línea dos/);
    expect(out.match(/<p[\s>]/g)).toHaveLength(2);
});

test('un enlace interno es un <a href> relativo; uno externo abre en otra pestaña', () => {
    const out = html('[ficha](/juego/e2e-juego-de-prueba-999001) y [fuera](https://example.com/x)');
    expect(out).toMatch(/<a [^>]*href="\/juego\/e2e-juego-de-prueba-999001"[^>]*>ficha<\/a>/);
    const internal = out.match(/<a [^>]*href="\/juego[^>]*>/)![0];
    expect(internal).not.toContain('target=');
    const external = out.match(/<a [^>]*href="https:\/\/example.com\/x"[^>]*>/)![0];
    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener"');
});

test('el HTML crudo no se renderiza y un enlace javascript: se neutraliza', () => {
    const out = html('Hola <b>crudo</b>\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))');
    expect(out).not.toContain('<b>');
    expect(out).not.toContain('<script');
    // Tampoco como texto escapado: `skipHtml` lo descarta, no lo muestra.
    expect(out).not.toContain('&lt;');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('crudo');
    expect(out).not.toContain('javascript:');
});

test('tabla GFM con la clase de la casa, imagen perezosa y cita', () => {
    const out = html('| A | B |\n|---|---|\n| 1 | 2 |\n\n![captura](https://example.com/a.png)\n\n> Cita');
    expect(out).toMatch(/<table class="pio-table"/);
    expect(out).toMatch(/<td>1<\/td>/);
    expect(out).toMatch(/<img [^>]*loading="lazy"/);
    expect(out).toMatch(/<img [^>]*alt="captura"/);
    expect(out).toMatch(/<blockquote[^>]*>[\s\S]*Cita[\s\S]*<\/blockquote>/);
});

test('`/\\host` es protocolo implícito para el navegador: se trata como externo', () => {
    const out = html('[a](//evil.com/x) [b](/\\evil.com/x) [c](/juego/ok)');
    // Aserción explícita (no un bucle sobre un match posiblemente vacío): si la
    // regex deja de excluir `//`, el enlace pasa a ser un <Link> interno sin
    // target y el test tiene que fallar.
    const protocolRelative = out.match(/<a [^>]*href="\/\/evil\.com\/x"[^>]*>/);
    expect(protocolRelative).not.toBeNull();
    expect(protocolRelative![0]).toContain('target="_blank"');
    expect(protocolRelative![0]).toContain('rel="noopener"');
    // `/\evil.com`: markdown ya codifica la `\` como `%5C` (ruta inocua del
    // propio sitio). Lo que no puede salir nunca es un href con `\` cruda.
    expect(out).not.toMatch(/href="\/\\/);
    expect(out).toMatch(/href="\/%5Cevil\.com\/x"/);
    expect(out.match(/<a [^>]*href="\/juego\/ok"[^>]*>/)![0]).not.toContain('target=');
});
