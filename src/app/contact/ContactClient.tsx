'use client';

import { useState } from 'react';
import { Container, Title, Box, Text, TextInput, Textarea, Button } from '@mantine/core';
import { submitContact, ApiError } from '@/lib/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_ERROR = 'No pudimos enviar tu mensaje. Intenta nuevamente más tarde.';

function extractErrorMessage(err: unknown): string {
    if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const messages = Object.values(err.data as Record<string, unknown>)
            .flat()
            .filter((m): m is string => typeof m === 'string');
        if (messages.length) return messages[0];
    }
    return DEFAULT_ERROR;
}

export default function ContactClient() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState<Status>('idle');
    const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            await submitContact(form);
            setStatus('success');
            setForm({ name: '', email: '', message: '' });
        } catch (err) {
            setErrorMessage(extractErrorMessage(err));
            setStatus('error');
        }
    };

    return (
        <Container size="sm" py={60}>
            <Title order={1} mb="xl" ta="center">Contacto</Title>

            <Box className="content-card" p="xl">
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
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
                    />
                    <TextInput
                        label="Correo electrónico"
                        placeholder="tucorreo@empresa.com"
                        type="email"
                        mb="md"
                        required
                        size="md"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
                    />
                    <Textarea
                        label="Mensaje"
                        placeholder="¿En qué te podemos ayudar?"
                        minRows={4}
                        mb="xl"
                        required
                        size="md"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.currentTarget.value })}
                    />

                    {status === 'success' && (
                        <Text c="green" mb="md" ta="center">
                            Mensaje enviado. ¡Gracias por escribirnos!
                        </Text>
                    )}
                    {status === 'error' && (
                        <Text c="red" mb="md" ta="center">
                            {errorMessage}
                        </Text>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        color="primaryRed"
                        fullWidth
                        loading={status === 'loading'}
                        disabled={status === 'loading'}
                    >
                        Enviar mensaje
                    </Button>
                </form>
            </Box>
        </Container>
    );
}
