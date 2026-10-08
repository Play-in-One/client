import type { Metadata } from 'next';
import { getPosts } from '@/lib/api';
import type { Post } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { blogJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import BlogListClient from './BlogListClient';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
    title: 'Blog — Noticias y Comunidad',
    description:
        'Noticias, ofertas y novedades del mundo gaming en Chile. Mantente al día con lo último de Play in One.',
    path: '/blog',
});

export default async function BlogPage() {
    let posts: Post[] = [];
    try {
        posts = (await getPosts({ ordering: '-published_date' })).results;
    } catch {
        /* render empty list on API failure */
    }
    // El índice declara cada post por su URL canónica (con slug) en el HTML
    // del servidor: es lo único que lee un crawler sin JavaScript.
    const jsonLd = [
        blogJsonLd(posts),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Blog', path: '/blog' },
        ]),
    ];
    return (
        <>
            <JsonLd data={jsonLd} />
            <BlogListClient initialPosts={posts} />
        </>
    );
}
