'use client';

import { useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Center,
    Group,
    PasswordInput,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { useAdmin } from '@/context/AdminContext';
import { ApiError } from '@/lib/api';

// Ruta secreta sin enlace: no aparece en navbar, footer ni sitemap. La barrera
// real es el login (usuario is_staff); la ruta solo oculta el punto de entrada.
export default function StaffLoginPage() {
    const { isAdmin, username, login, logout } = useAdmin();
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(user.trim(), password);
            setPassword('');
        } catch (err) {
            if (err instanceof ApiError && err.status === 403) {
                setError('La cuenta no tiene permisos de administrador.');
            } else if (err instanceof ApiError && err.status === 401) {
                setError('Credenciales inválidas.');
            } else if (err instanceof ApiError && err.status === 429) {
                setError('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
            } else {
                setError('No se pudo iniciar sesión. Revisa tu conexión.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Center mih="70vh" px="md">
            <Card withBorder shadow="sm" radius="md" p="xl" w={380} maw="100%">
                {isAdmin ? (
                    <Stack>
                        <Group justify="space-between">
                            <Title order={3}>Sesión de administrador</Title>
                            <Badge color="green">Activa</Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                            Conectado como <b>{username}</b>. Ya puedes editar juegos y
                            productos directamente en sus páginas.
                        </Text>
                        <Button variant="light" color="red" onClick={logout}>
                            Cerrar sesión
                        </Button>
                    </Stack>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Stack>
                            <Title order={3}>Acceso administrador</Title>
                            {error && (
                                <Alert color="red" variant="light">
                                    {error}
                                </Alert>
                            )}
                            <TextInput
                                label="Usuario"
                                value={user}
                                onChange={(e) => setUser(e.currentTarget.value)}
                                autoComplete="username"
                                required
                            />
                            <PasswordInput
                                label="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.currentTarget.value)}
                                autoComplete="current-password"
                                required
                            />
                            <Button type="submit" loading={loading} fullWidth>
                                Iniciar sesión
                            </Button>
                        </Stack>
                    </form>
                )}
            </Card>
        </Center>
    );
}
