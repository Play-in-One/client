'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Container, Title, Box, Text, Badge, Image, useMantineColorScheme, Skeleton } from '@mantine/core';
import { getPost } from '@/lib/api';
import type { Post } from '@/lib/types';

export default function BlogPostPage() {
    const params = useParams();
    const { id } = params;
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (!id) return;
        getPost(id as string)
            .then(setPost)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <Container size="md" py={60}>
                <Skeleton height={30} width="40%" mb="xl" />
                <Skeleton height={200} mb="xl" />
                <Skeleton height={20} mb="sm" />
                <Skeleton height={20} mb="sm" />
                <Skeleton height={20} width="80%" />
            </Container>
        );
    }

    if (!post) {
        return (
            <Container size="md" py={60}>
                <Title order={1}>Post no encontrado</Title>
            </Container>
        );
    }

    return (
        <Container size="md" py={60}>
            <Badge color="primaryRed" mb="md">{post.category}</Badge>
            <Title order={1} mb="sm">{post.title}</Title>
            <Text c="dimmed" mb="xl">
                {new Date(post.published_date).toLocaleDateString()}
            </Text>

            {post.image && (
                <Box mb="xl" style={{ borderRadius: 'var(--mantine-radius-lg)', overflow: 'hidden' }}>
                    <Image src={post.image} alt={post.title} width="100%" />
                </Box>
            )}

            <Box
                bg={isDark ? 'var(--mantine-color-dark-6)' : 'white'}
                p="xl"
                style={{ borderRadius: 'var(--mantine-radius-lg)', border: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)'}` }}
            >
                {post.description.split('\n').map((paragraph, idx) => (
                    <Text key={idx} mb="md" style={{ whiteSpace: 'pre-wrap' }}>
                        {paragraph}
                    </Text>
                ))}
            </Box>
        </Container>
    );
}
