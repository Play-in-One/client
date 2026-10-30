"use client";

import { Alert, Button, Container, Stack } from '@mantine/core';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <Container py="xl"><Stack>
        <Alert color="danger" title="No pudimos cargar esta página">Inténtalo nuevamente en unos momentos.</Alert>
        <Button onClick={reset}>Reintentar</Button>
    </Stack></Container>;
}
