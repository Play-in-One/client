import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPost } from '@/lib/api';
import type { Post } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, articleJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import BlogPostClient from './BlogPostClient';

async function fetchPost(id: string): Promise<Post | null> {
    try {
        return await getPost(id);
    } catch {
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const post = await fetchPost(id);
    if (!post) return buildMetadata({ title: 'Post no encontrado', noIndex: true });

    return buildMetadata({
        title: post.title,
        description: post.description?.slice(0, 200),
        path: `/blog/${post.id}`,
        image: post.image,
        type: 'article',
        publishedTime: post.published_date,
    });
}

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const post = await fetchPost(id);
    if (!post) notFound();

    const jsonLd = [
        articleJsonLd(post),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.id}` },
        ]),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <BlogPostClient initialPost={post} />
        </>
    );
}
