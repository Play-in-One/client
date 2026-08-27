'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Anchor,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    List,
    Stack,
    Switch,
    Table,
    Text,
    Title,
} from '@mantine/core';

import { useConsent } from '@/context/ConsentContext';
import { CONSENT_MAX_AGE_SECONDS } from '@/lib/consent';

const COOKIES = [
    {
        name: 'pio_consent',
        purpose: 'Recuerda qué decidiste en este panel, para no volver a preguntártelo en cada visita.',
        duration: '13 meses',
        needed: 'Siempre que hayas decidido algo',
    },
    {
        name: 'pio_vid',
        purpose: 'Un número aleatorio que nos deja saber si vuelves, sin saber quién eres.',
        duration: '13 meses',
        needed: 'Solo si aceptas la analítica',
    },
];

const MONTHS = Math.round(CONSENT_MAX_AGE_SECONDS / (60 * 60 * 24 * 30));

export function CookiePreferences() {
    const { consent, ready, decide, forget } = useConsent();
    const [busy, setBusy] = useState(false);
    const [forgotten, setForgotten] = useState(false);

    const analytics = consent?.analytics ?? false;
    const measure = consent?.measure ?? true;

    async function apply(choice: Parameters<typeof decide>[0]) {
        setBusy(true);
        setForgotten(false);
        try {
            await decide(choice);
        } finally {
            setBusy(false);
        }
    }

    async function handleForget() {
        setBusy(true);
        try {
            setForgotten(await forget());
        } finally {
            setBusy(false);
        }
    }

    return (
        <Stack gap="xl">
            <Box className="content-card" p="xl">
                <Title order={2} fz="lg" mb="md">Tus preferencias</Title>

                <Stack gap="lg">
                    <Switch
                        checked={analytics}
                        disabled={!ready || busy}
                        onChange={(event) => apply(event.currentTarget.checked ? 'accept' : 'essential')}
                        label="Recordar mi navegador para saber si vuelvo"
                        description={`Guarda la cookie pio_vid durante ${MONTHS} meses. Es lo que nos permite distinguir entre mil visitas de mil personas y mil visitas de cien personas.`}
                    />

                    <Divider />

                    <Switch
                        checked={measure}
                        disabled={!ready || busy}
                        onChange={(event) => apply(event.currentTarget.checked ? 'essential' : 'reject-all')}
                        label="Contarme en las estadísticas anónimas"
                        description="Medición agregada sin guardar nada en tu dispositivo: el servidor calcula un código que caduca cada 24 horas. Desactívalo si prefieres no aparecer en ninguna cifra."
                    />

                    {ready && consent === null && (
                        <Text fz="sm" c="dimmed">
                            Aún no has decidido nada. Mientras tanto solo se aplica la medición
                            anónima, que no deja nada en tu dispositivo.
                        </Text>
                    )}
                </Stack>
            </Box>

            <Box className="content-card" p="xl">
                <Title order={2} fz="lg" mb="md">Qué cookies usamos</Title>
                <Table.ScrollContainer minWidth={520}>
                    <Table striped withTableBorder verticalSpacing="sm" fz="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Cookie</Table.Th>
                                <Table.Th>Para qué sirve</Table.Th>
                                <Table.Th>Duración</Table.Th>
                                <Table.Th>Cuándo existe</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {COOKIES.map((cookie) => (
                                <Table.Tr key={cookie.name}>
                                    <Table.Td>
                                        <Badge variant="light" tt="none" fz="xs">{cookie.name}</Badge>
                                    </Table.Td>
                                    <Table.Td c="dimmed">{cookie.purpose}</Table.Td>
                                    <Table.Td c="dimmed">{cookie.duration}</Table.Td>
                                    <Table.Td c="dimmed">{cookie.needed}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>

                <Text fz="sm" c="dimmed" mt="md">
                    Ninguna es de terceros y ninguna sirve para publicidad. Play in One no carga
                    Google Analytics, ni píxeles de redes sociales, ni etiquetas de anunciantes.
                    Detalle completo en la{' '}
                    <Anchor component={Link} href="/privacy">Política de Privacidad</Anchor>.
                </Text>
            </Box>

            <Box className="content-card" p="xl">
                <Title order={2} fz="lg" mb="xs">Borrar mis datos</Title>
                <Text fz="md" c="dimmed" mb="md">
                    Elimina de nuestra base de datos el identificador de este navegador y todo lo
                    asociado a él, y borra las dos cookies. Es inmediato y no hace falta que nos
                    escribas. Después de hacerlo:
                </Text>
                <List spacing={4} fz="sm" c="dimmed" mb="lg">
                    <List.Item>Volverás a ser un visitante nuevo y el aviso reaparecerá.</List.Item>
                    <List.Item>
                        Los eventos que ya se registraron sobreviven como cifras sueltas sin nada que
                        apunte a ti: no podemos borrar filas que ya no sabemos que eran tuyas.
                    </List.Item>
                </List>

                {forgotten && (
                    <Alert variant="light" color="green" mb="md">
                        Listo. Tus datos se borraron y este navegador vuelve a ser anónimo.
                    </Alert>
                )}

                <Group>
                    <Button color="red" variant="light" loading={busy} disabled={!ready} onClick={handleForget}>
                        Borrar mis datos
                    </Button>
                </Group>
            </Box>
        </Stack>
    );
}
