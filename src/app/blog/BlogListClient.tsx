'use client';

import { useState } from 'react';
import { Alert, Anchor, Button, Container, Group, Title, SimpleGrid } from '@mantine/core';
import { IconPlus, IconRss } from '@tabler/icons-react';
import type { Post } from '@/lib/types';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import PostEditorModal from '@/components/PostEditorModal';
import { postPath } from '@/lib/seo';
import PostCard from '@/components/PostCard';

export default function BlogListClient({ initialPosts }: { initialPosts: Post[] }) {
    const { isAdmin } = useAdmin();
    const [creating, setCreating] = useState(false);
    const [createdPosts, setCreatedPosts] = useState<Post[]>([]);
    const [lastCreated, setLastCreated] = useState<Post | null>(null);
    const posts = [...createdPosts, ...initialPosts.filter((post) => !createdPosts.some((created) => created.id === post.id))];

    return (
        <Container size="lg" py="section">
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
                <Alert color="success" mb="lg" role="status">
                    Post publicado. <Link href={postPath(lastCreated)}>Ver post</Link>
                </Alert>
            )}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
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
