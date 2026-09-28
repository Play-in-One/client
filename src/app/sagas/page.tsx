import type { Metadata } from 'next';
import { Container, Stack, Text, Title } from '@mantine/core';
import SagaCard from '@/components/SagaCard';
import { getSagas } from '@/lib/api';
import type { Saga } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/seo';

// El catálogo de sagas lo cura un admin a mano; cambia poco. 5 min lo
// mantiene fresco sin pagar el fetch en cada visita.
export const revalidate = 300;

async function fetchSagas(): Promise<Saga[]> {
    try {
        const res = await getSagas();
        return res.results;
    } catch {
        return [];
    }
}

const DESCRIPTION =
    'Todas las sagas y franquicias de videojuegos disponibles en Play in One: elegí una para ' +
    'ver sus juegos y comparar precios entre tiendas chilenas.';

export function generateMetadata(): Metadata {
    return buildMetadata({
        title: 'Explorar sagas de videojuegos',
        description: DESCRIPTION,
        path: '/sagas',
    });
}

export default async function SagasPage() {
    const sagas = await fetchSagas();

    const jsonLd = [
        collectionPageJsonLd({
            name: 'Sagas de videojuegos',
            description: DESCRIPTION,
            path: '/sagas',
        }),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Sagas', path: '/sagas' },
        ]),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <Container size="lg" py="xl">
                <Title order={1} fz={{ base: 28, md: 36 }} fw={800} mb="sm">
                    Explorar sagas
                </Title>
                <Text c="dimmed" mb="xl">
                    {DESCRIPTION}
                </Text>

                {sagas.length > 0 ? (
                    <Stack gap="md">
                        {sagas.map((saga) => (
                            <SagaCard key={saga.slug} saga={saga} />
                        ))}
                    </Stack>
                ) : (
                    <Text c="dimmed">Todavía no hay sagas cargadas.</Text>
                )}
            </Container>
        </>
    );
}
