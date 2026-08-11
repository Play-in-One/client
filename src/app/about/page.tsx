import type { Metadata } from 'next';
import { Container, Title, Text, Box, Card } from '@mantine/core';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
    title: 'Sobre Nosotros',
    description:
        'Play in One es una plataforma web que te permite comparar los precios de videojuegos entre 50+ tiendas a nivel nacional.',
    path: '/about',
});

export default function AboutPage() {
    return (
        <Container size="md" py={60}>
            <Title order={1} mb="xl" ta="center">Sobre Nosotros</Title>

            <Box className="content-card" p="xl" mb="xl">
                <Text fz="lg" mb="md">
                    En <strong>Play in One</strong> (codename PIO), nuestra misión es ayudarte a cotizar los mejores precios para tus juegos favoritos.
                    Sabemos que el hobby puede ser costoso y que a veces es difícil comparar precios entre tantas tiendas.
                </Text>
                <Text fz="lg" mb="md">
                    Por eso, creamos un comparador actualizado a diario que te permite encontrar rápidamente dónde está más barato el juego que buscas.
                    Además, recopilamos los datos y ofertas diarias para que no te pierdas de nada.
                </Text>
                <Text fz="lg">
                    ¡Gracias por usar Play in One! Esperamos que esta herramienta te ayude a ahorrar aunque sea un poco y a disfrutar de más y mejores juegos.
                </Text>
            </Box>

            <Title order={2} ta="center" mt={60} mb="md">¿Qué es PIO?</Title>
            <Box className="content-card" p="xl" mb="xl">
                <Text fz="lg" ta="center">
                    Play in One es una plataforma web que te permite comparar los precios de videojuegos entre 50+ tiendas a nivel nacional.
                    Nuestro objetivo es que encuentres el juego que quieras al mejor precio, siempre.
                </Text>
            </Box>

            <Title order={2} ta="center" mt={60} mb="xl">Fundadores</Title>
            <Card withBorder radius="lg" padding="xl" ta="center">
                <Text c="dimmed">
                    Dos egresados de ingeniería apasionados por el mundo start up, el desarrollo web, la tecnología y los videojuegos (entre otros).
                    Estamos comprometidos en crear la mejor plataforma para la comunidad en Chile.
                </Text>
            </Card>
        </Container>
    );
}
