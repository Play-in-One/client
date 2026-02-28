'use client';

import { useEffect, useState } from 'react';
import { Container, Title, SimpleGrid, Card, Box, Text, useMantineColorScheme, Badge } from '@mantine/core';
import { IconDeviceGamepad } from '@tabler/icons-react';
import { getPosts } from '@/lib/api';
import type { Post } from '@/lib/types';
import Link from 'next/link';

export default function BlogPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        getPosts({ ordering: '-published_date' })
            .then((res) => setPosts(res.results))
            .catch(console.error);
    }, []);

    return (
        <Container size="lg" py={60}>
            <Title order={1} mb="xl">Noticias y Comunidad</Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {posts.map((post) => (
                    <Card
                        key={post.id}
                        component={Link}
                        href={`/blog/${post.id}`}
                        withBorder
                        shadow="sm"
                        radius="lg"
                        p={0}
                        style={{ overflow: 'hidden', transition: 'box-shadow 0.3s', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}
                    >
                        <Box
                            h={180}
                            bg={isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-2)'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {post.image ? (
                                <img src={post.image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <IconDeviceGamepad size={48} color="var(--mantine-color-dimmed)" />
                            )}
                        </Box>
                        <Box p="lg">
                            <Badge color="primaryRed" mb="sm">{post.category}</Badge>
                            <Text fw={700} fz="lg" mb="xs" lineClamp={2}>{post.title}</Text>
                            <Text fz="sm" c="dimmed" lineClamp={3}>{post.description}</Text>
                            <Text fz="xs" c="dimmed" mt="md">
                                {new Date(post.published_date).toLocaleDateString()}
                            </Text>
                        </Box>
                    </Card>
                ))}
            </SimpleGrid>
        </Container>
    );
}
