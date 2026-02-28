'use client';

import { Container, Title, Box, Text, TextInput, Textarea, Button, useMantineColorScheme } from '@mantine/core';

export default function ContactPage() {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Mensaje enviado (simulado)');
    };

    return (
        <Container size="sm" py={60}>
            <Title order={1} mb="xl" ta="center">Contacto</Title>

            <Box
                bg={isDark ? 'var(--mantine-color-dark-6)' : 'white'}
                p="xl"
                style={{ borderRadius: 'var(--mantine-radius-lg)', border: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)'}` }}
            >
                <Text fz="md" c="dimmed" mb="xl" ta="center">
                    ¿Tienes dudas, sugerencias o quieres agregar tu tienda al comparador? Escríbenos.
                </Text>

                <form onSubmit={handleSubmit}>
                    <TextInput
                        label="Nombre"
                        placeholder="Tu nombre o el de la empresa..."
                        mb="md"
                        required
                        size="md"
                    />
                    <TextInput
                        label="Correo electrónico"
                        placeholder="tucorreo@empresa.com"
                        type="email"
                        mb="md"
                        required
                        size="md"
                    />
                    <Textarea
                        label="Mensaje"
                        placeholder="¿En qué te podemos ayudar?"
                        minRows={4}
                        mb="xl"
                        required
                        size="md"
                    />

                    <Button type="submit" size="lg" color="primaryRed" fullWidth>
                        Enviar mensaje
                    </Button>
                </form>
            </Box>
        </Container>
    );
}
