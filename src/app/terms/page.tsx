'use client';

import { Container, Title, Box, Text, useMantineColorScheme } from '@mantine/core';

export default function TermsPage() {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Container size="md" py={60}>
            <Title order={1} mb="xl" ta="center">Términos de Servicio</Title>

            <Box
                bg={isDark ? 'var(--mantine-color-dark-6)' : 'white'}
                p="xl"
                style={{ borderRadius: 'var(--mantine-radius-lg)', border: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)'}` }}
            >
                <Text fw={700} mb="xs">1. Aceptación de los Términos</Text>
                <Text fz="md" c="dimmed" mb="lg">
                    Al acceder a Play in One, aceptas estar sujeto a estos términos y condiciones. Si no estás de acuerdo, te rogamos no uses la plataforma.
                </Text>

                <Text fw={700} mb="xs">2. Objetivo del Servicio</Text>
                <Text fz="md" c="dimmed" mb="lg">
                    Play in One es un motor de búsqueda y comparador de precios de videojuegos. No somos una tienda, ni vendemos productos directamente. Solo mostramos información en la web extraída de diversas tiendas.
                </Text>

                <Text fw={700} mb="xs">3. Exactitud de la Información</Text>
                <Text fz="md" c="dimmed" mb="lg">
                    Aunque nos esforzamos en que los precios y el stock estén actualizados, puede haber demoras en la sincronización con las tiendas finales. El precio final y la disponibilidad siempre serán los mostrados en la página oficial del vendedor.
                </Text>

                <Text fw={700} mb="xs">4. Enlaces a Terceros</Text>
                <Text fz="md" c="dimmed" mb="lg">
                    Nuestra web enlaza a tiendas de terceros. No nos hacemos responsables del contenido, privacidad, ni de las transacciones que ocurran en esos sitios web.
                </Text>

                <Text fw={700} mb="xs">5. Modificaciones</Text>
                <Text fz="md" c="dimmed" mb="lg">
                    Nos reservamos el derecho a modificar estos términos en cualquier momento. El uso continuado de la plataforma tras haber realizado cambios implica tu aceptación de las nuevas políticas.
                </Text>

                <Text fw={700} mb="xs">6. Privacidad</Text>
                <Text fz="md" c="dimmed">
                    Los datos recopilados por nosotros se rigen bajo altos estándares de confidencialidad. Los datos personales provistos directa o indirectamente solo serán usados para las funcionalidades de la página web.
                </Text>
            </Box>
        </Container>
    );
}
