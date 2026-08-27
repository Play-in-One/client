import type { Metadata } from 'next';
import { Container, Title, Text } from '@mantine/core';

import { buildMetadata } from '@/lib/seo';
import { CookiePreferences } from './CookiePreferences';

export const metadata: Metadata = buildMetadata({
    title: 'Cookies y preferencias',
    description:
        'Qué cookies usa Play in One, para qué sirve cada una y cómo cambiar tus preferencias o borrar tus datos.',
    path: '/cookies',
});

export default function CookiesPage() {
    return (
        <Container size="md" py={60}>
            <Title order={1} mb="xs" ta="center">Cookies y preferencias</Title>
            <Text fz="sm" c="dimmed" ta="center" mb="xl">
                Dos cookies, ninguna de terceros, ninguna publicitaria.
            </Text>
            <CookiePreferences />
        </Container>
    );
}
