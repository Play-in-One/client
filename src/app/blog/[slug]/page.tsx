import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { CATEGORY_LABEL, postExcerpt } from '@/lib/postText';
import { buildMetadata, articleJsonLd, breadcrumbJsonLd, postPath } from '@/lib/seo';
import BlogPostClient from './BlogPostClient';
import { fetchPost, parsePostSegment } from './resolve';

/*
 * Los posts se cachean 300 s como el listado. `generateStaticParams` existe y
 * devuelve `[]` a propósito: sin la función, Next trata el segmento dinámico
 * como dinámico puro e IGNORA `revalidate` (cada lectura se renderizaba por
 * petición). Con la lista vacía no se prerenderiza nada en el build, que no ve
 * la API, y cada post se cachea tras su primera visita. El backend revalida
 * `/blog/<slug>-<id>` al guardar.
 *
 * Esta ruta NO tiene `loading.tsx`, y no debe tenerlo mientras el status se
 * decida en el page. Sin boundary de streaming el `notFound()` y el
 * `permanentRedirect()` de abajo salen como un 404 y un 308 de verdad. Con un
 * `loading.tsx`, la respuesta ya habría viajado como 200 al llamarlos y Google
 * vería un "soft 404" o una redirección por meta refresh; si alguna vez hace
 * falta uno, el status tiene que pasar a un layout, como en
 * `juego/[slug]/layout.tsx`.
 */
export const revalidate = 300;

export function generateStaticParams() {
    return [];
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const parsed = parsePostSegment((await params).slug);
    const post = parsed ? await fetchPost(parsed.id) : null;
    if (!post) return buildMetadata({ title: 'Post no encontrado', noIndex: true });

    return buildMetadata({
        // El sufijo nombra el blog, no solo el sitio: `absoluteTitle` evita
        // que la plantilla del layout añada además "| Play in One".
        title: `${post.title} | Blog de Play in One`,
        absoluteTitle: true,
        description: postExcerpt(post.description),
        path: postPath(post),
        image: post.image,
        type: 'article',
        publishedTime: post.published_date,
        modifiedTime: post.updated_at ?? post.published_date,
        section: CATEGORY_LABEL[post.category],
    });
}

export default async function BlogPostPage({ params }: Params) {
    const parsed = parsePostSegment((await params).slug);
    if (!parsed) notFound();
    const post = await fetchPost(parsed.id);
    if (!post) notFound();
    // `/blog/<id>` (enlaces viejos) o un slug desactualizado tras corregir el
    // título: una sola URL por post. Sin `slug` (backend anterior al campo)
    // no hay canónica distinta a la que mandar.
    if (post.slug && parsed.slug !== post.slug) permanentRedirect(postPath(post));

    const jsonLd = [
        articleJsonLd(post),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: postPath(post) },
        ]),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <BlogPostClient initialPost={post} />
        </>
    );
}
