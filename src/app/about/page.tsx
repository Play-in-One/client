import type { Metadata } from 'next';
import { Container, Title, Text, Box, SimpleGrid, Card } from '@mantine/core';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
    title: 'Sobre Nosotros',
    description:
        'Play in One ayuda a los gamers de Chile a encontrar los mejores precios comparando decenas de tiendas en tiempo real.',
    path: '/about',
});

export default function AboutPage() {
    return (
        <Container size="md" py={60}>
            <Title order={1} mb="xl" ta="center">Sobre Nosotros</Title>

            <Box className="content-card" p="xl" mb="xl">
                <Text fz="lg" mb="md">
                    En <strong>Play in One</strong>, nuestra misión es ayudar a los gamers de todo Chile a encontrar los mejores precios para sus juegos favoritos.
                    Sabemos que el hobby puede ser costoso y que a veces es difícil comparar precios entre tantas tiendas.
                </Text>
                <Text fz="lg" mb="md">
                    Por eso creamos un comparador en tiempo real que te permite encontrar rápidamente dónde está más barato el juego que buscas.
                    Además, recopilamos los datos y ofertas diarias para que no te pierdas de nada.
                </Text>
                <Text fz="lg">
                    ¡Gracias por usar Play in One! Esperamos que esta herramienta te ayude a ahorrar dinero y disfrutar de más y mejores juegos.
                </Text>
            </Box>

            <Title order={2} ta="center" mt={60} mb="xl">Nuestro Equipo</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                <Card withBorder radius="lg" padding="xl" ta="center">
                    <Title order={4} mb="xs">Fundadores</Title>
                    <Text c="dimmed">Un grupo de gamers apasionados por el desarrollo web y los videojuegos, comprometidos en crear la mejor plataforma para la comunidad en Chile.</Text>
                </Card>
                <Card withBorder radius="lg" padding="xl" ta="center">
                    <Title order={4} mb="xs">Nuestra Visión</Title>
                    <Text c="dimmed">Convertirnos en el lugar de referencia número 1 en todo Latinoamérica para cotizar videojuegos y productos de gaming.</Text>
                </Card>
            </SimpleGrid>
        </Container>
    );
}
