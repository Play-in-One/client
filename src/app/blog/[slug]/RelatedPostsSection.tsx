import Link from 'next/link';
import { Anchor, Badge, Box, Card, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { getPosts } from '@/lib/api';
import { CATEGORY_LABEL, postExcerpt } from '@/lib/postText';
import { postPath } from '@/lib/seo';
import type { Post } from '@/lib/types';

const LIMIT = 3;
/* Mismo plazo que el post (`revalidate` de page.tsx): una lista más fresca que
   la página que la contiene no se vería antes. */
const REVALIDATE = 300;

/** Un fallo de la API deja la sección vacía, nunca tumba el artículo: los
 *  relacionados son un extra y el post ya se resolvió. */
async function safePosts(params: Parameters<typeof getPosts>[0]): Promise<Post[]> {
    try {
        return (await getPosts({ ...params, revalidate: REVALIDATE })).results;
    } catch (err) {
        console.error('Failed to fetch related posts:', err);
        return [];
    }
}

/** Hasta 3 posts: primero los más recientes de la misma categoría y, si no
 *  alcanzan, los más recientes del blog. Nunca el propio post ni repetidos. */
export async function relatedPosts(post: Post): Promise<Post[]> {
    // En paralelo: el relleno casi siempre hace falta (hay pocas categorías con
    // tres posts) y esperar a la primera respuesta solo sumaría latencia.
    const [sameCategory, latest] = await Promise.all([
        safePosts({ category: post.category, ordering: '-published_date' }),
        safePosts({ ordering: '-published_date' }),
    ]);
    const picked: Post[] = [];
    const seen = new Set([post.id]);
    for (const candidate of [...sameCategory, ...latest]) {
        if (picked.length === LIMIT) break;
        if (seen.has(candidate.id)) continue;
        seen.add(candidate.id);
        picked.push(candidate);
    }
    return picked;
}

/**
 * «Más del blog» al pie de un post, renderizado en el SERVIDOR.
 *
 * Son `<a href>` en el HTML inicial: para un crawler es el camino de un
 * artículo a los demás, que de otro modo solo se alcanzan desde `/blog`. Sin
 * JSON-LD por el mismo motivo que `RelatedGamesSection`: son enlaces, no una
 * lista que ESTA página sea. Solo primitivas de Mantine (`Card` sin
 * `Card.Section`): los compuestos llegan como `undefined` a un Server
 * Component.
 */
export default async function RelatedPostsSection({ post }: { post: Post }) {
    const posts = await relatedPosts(post);
    if (posts.length === 0) return null;

    return (
        <Box component="section" aria-labelledby="posts-relacionados" pb={60}>
            {/* 'md' como el Container de BlogPostClient: alineado con el artículo. */}
            <Container size="md">
                <Group justify="space-between" align="flex-end" mb="lg">
                    <Title order={2} id="posts-relacionados" fz="lg" fw={700}>
                        Más del blog
                    </Title>
                    <Anchor
                        component={Link}
                        href="/blog"
                        c="var(--mantine-color-primaryRed-5)"
                        fw={600}
                        fz="sm"
                        underline="never"
                    >
                        Ver todo el blog
                    </Anchor>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                    {posts.map((related) => (
                        <Card key={related.id} withBorder radius="lg" padding="lg">
                            <Badge color="primaryRed" mb="sm" style={{ alignSelf: 'flex-start' }}>
                                {CATEGORY_LABEL[related.category] ?? related.category}
                            </Badge>
                            <Anchor
                                component={Link}
                                href={postPath(related)}
                                fw={700}
                                c="inherit"
                                underline="hover"
                                mb="xs"
                                lineClamp={2}
                            >
                                {related.title}
                            </Anchor>
                            <Text fz="sm" c="dimmed" lineClamp={3}>
                                {postExcerpt(related.description, 110)}
                            </Text>
                        </Card>
                    ))}
                </SimpleGrid>
            </Container>
        </Box>
    );
}
