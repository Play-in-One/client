import Link from 'next/link';
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { Anchor, Text, Title } from '@mantine/core';

/**
 * Cuerpo Markdown de un post del blog.
 *
 * SIN `'use client'` a propósito: montado desde `blog/[slug]/page.tsx` se
 * renderiza en el SERVIDOR, y el HTML inicial es lo único que leen GPTBot,
 * ClaudeBot y compañía, que no ejecutan JS. Por eso solo usa primitivas de
 * Mantine (Title, Text, Anchor): los compuestos (`List.Item`,
 * `Table.Tr`…) llegan como `undefined` a un Server Component y el render
 * revienta. Listas y tablas van como elementos nativos con el estilo de
 * `.pio-prose` y `.pio-table` en globals.css.
 *
 * `remark-breaks` conserva el formato de los posts anteriores al Markdown,
 * escritos como texto plano con un salto simple entre párrafos: cada `\n`
 * sale como `<br>` y no se funde con la línea siguiente.
 *
 * Seguridad: `skipHtml` descarta el HTML crudo del cuerpo (solo lo escribe
 * staff, pero un `<script>` pegado desde otra web no debe ejecutarse), y el
 * `urlTransform` por defecto de react-markdown neutraliza `javascript:` y
 * demás protocolos no seguros en enlaces e imágenes. No se le pasa otro.
 */

const components: Components = {
    // Un post tiene UN <h1>: su título, que pinta BlogPostClient. Un `#` en el
    // cuerpo es en la práctica un subtítulo, y dos <h1> desordenan el esquema
    // de encabezados que leen los buscadores.
    // Sin `mt`/`mb`: los márgenes van en `.pio-prose` (globals.css). Como
    // props de Mantine salen como estilo inline, y el inline le gana a la regla
    // que quita el margen al primer y al último bloque de la tarjeta.
    h1: ({ children }) => <Title order={2}>{children}</Title>,
    h2: ({ children }) => <Title order={2}>{children}</Title>,
    h3: ({ children }) => <Title order={3}>{children}</Title>,
    p: ({ children }) => <Text component="p">{children}</Text>,
    a: ({ href, children }) => <PostLink href={href}>{children}</PostLink>,
    // `alt` siempre presente: sin texto alternativo, una imagen sin descripción
    // se lee como su URL.
    img: ({ src, alt }) => (
        // eslint-disable-next-line @next/next/no-img-element -- la URL la escribe staff y puede ser de cualquier dominio; next/image exige declararlos.
        <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} loading="lazy" />
    ),
    table: ({ children }) => (
        // La tabla ancha se desplaza dentro de su caja en vez de ensanchar la página.
        <div className="pio-prose-table">
            <table className="pio-table">{children}</table>
        </div>
    ),
};

function PostLink({ href, children }: { href?: string; children: ReactNode }) {
    // Interno (`/juego/...`): navegación del router sin recargar. `//host` y
    // `/\host` son enlaces externos con protocolo implícito (el navegador
    // normaliza `\` a `/`), no rutas del sitio.
    if (href && /^\/(?![\/\\])/.test(href)) {
        return <Anchor component={Link} href={href}>{children}</Anchor>;
    }
    return <Anchor href={href} target="_blank" rel="noopener">{children}</Anchor>;
}

export default function PostBody({ markdown }: { markdown: string }) {
    return (
        <div className="pio-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} skipHtml components={components}>
                {markdown}
            </ReactMarkdown>
        </div>
    );
}
