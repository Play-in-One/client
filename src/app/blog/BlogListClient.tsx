'use client';

import { useState } from 'react';
import { Alert, Anchor, Button, Container, Group, Title, SimpleGrid, Card, Box, Text, Badge } from '@mantine/core';
import { IconDeviceGamepad, IconPlus, IconRss } from '@tabler/icons-react';
import type { Post } from '@/lib/types';
import { trackEvent } from '@/lib/api';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import PostEditorModal from '@/components/PostEditorModal';
import { CATEGORY_LABEL, postExcerpt } from '@/lib/postText';
import { formatDate, postPath } from '@/lib/seo';

export default function BlogListClient({ initialPosts }: { initialPosts: Post[] }) {
    const { isAdmin } = useAdmin();
    const [creating, setCreating] = useState(false);
    const [createdPosts, setCreatedPosts] = useState<Post[]>([]);
    const [lastCreated, setLastCreated] = useState<Post | null>(null);
    const posts = [...createdPosts, ...initialPosts.filter((post) => !createdPosts.some((created) => created.id === post.id))];

    return (
        <Container size="lg" py={60}>
            <Group justify="space-between" mb="xl">
                <Group gap="xs" align="baseline">
                    <Title order={1}>Noticias y Comunidad</Title>
                    <Anchor href="/blog/rss.xml" fz="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconRss size={16} aria-hidden /> RSS
                    </Anchor>
                </Group>
                {isAdmin && (
                    <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>Crear post</Button>
                )}
            </Group>
            {lastCreated && (
                <Alert color="green" mb="lg" role="status">
                    Post publicado. <Link href={postPath(lastCreated)}>Ver post</Link>
                </Alert>
            )}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {posts.map((post) => (
                    <Card
                        key={post.id}
                        component={Link}
                        href={postPath(post)}
                        withBorder
                        shadow="sm"
                        radius="lg"
                        p={0}
                        style={{ overflow: 'hidden', transition: 'box-shadow 0.3s', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                        onClick={() => trackEvent({ event_type: 'post_click', post: post.id })}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}
                    >
                        <Box
                            h={180}
                            bg="light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))"
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
                            <Badge color="primaryRed" mb="sm">{CATEGORY_LABEL[post.category] ?? post.category}</Badge>
                            <Text fw={700} fz="lg" mb="xs" lineClamp={2}>{post.title}</Text>
                            {/* El cuerpo es Markdown: la tarjeta muestra el resumen en texto
                                plano, el mismo de la meta description. */}
                            <Text fz="sm" c="dimmed" lineClamp={3}>{postExcerpt(post.description)}</Text>
                            <Text fz="xs" c="dimmed" mt="md" component="time" dateTime={post.published_date}>
                                {formatDate(post.published_date)}
                            </Text>
                        </Box>
                    </Card>
                ))}
            </SimpleGrid>
            {creating && (
                <PostEditorModal
                    onClose={() => setCreating(false)}
                    onSaved={(post) => {
                        setCreatedPosts((current) => [post, ...current]);
                        setLastCreated(post);
                        setCreating(false);
                    }}
                />
            )}
        </Container>
    );
}
