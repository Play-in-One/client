'use client';

import { Container, Title, Box, Text, Badge, Image } from '@mantine/core';
import type { Post } from '@/lib/types';

export default function BlogPostClient({ initialPost }: { initialPost: Post }) {
    const post = initialPost;

    return (
        <Container size="md" py={60}>
            <Badge color="primaryRed" mb="md">{post.category}</Badge>
            <Title order={1} mb="sm">{post.title}</Title>
            <Text c="dimmed" mb="xl" component="time" dateTime={post.published_date}>
                {new Date(post.published_date).toLocaleDateString()}
            </Text>

            {post.image && (
                <Box mb="xl" style={{ borderRadius: 'var(--mantine-radius-lg)', overflow: 'hidden' }}>
                    <Image src={post.image} alt={post.title} width="100%" />
                </Box>
            )}

            <Box className="content-card" p="xl">
                {post.description.split('\n').map((paragraph, idx) => (
                    <Text key={idx} mb="md" style={{ whiteSpace: 'pre-wrap' }}>
                        {paragraph}
                    </Text>
                ))}
            </Box>
        </Container>
    );
}
