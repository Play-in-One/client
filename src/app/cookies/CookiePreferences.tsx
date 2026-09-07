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
        origin: 'Propia',
        purpose: 'Recuerda qué decidiste en este panel, para no volver a preguntártelo en cada visita.',
        duration: '13 meses',
        needed: 'Siempre que hayas decidido algo',
    },
    {
        name: 'pio_vid',
        origin: 'Propia',
        purpose: 'Un número aleatorio que nos deja saber si vuelves, sin saber quién eres.',
        duration: '13 meses',
        needed: 'Solo si aceptas la analítica',
    },
    {
        name: '__gads, __gpi',
        origin: 'Google',
        purpose: 'Miden cuántas veces has visto un anuncio, limitan que se repita y detectan clics fraudulentos.',
        duration: 'Hasta 13 meses',
        needed: 'Al cargarse un anuncio, personalizado o no',
    },
    {
        name: 'Cookies de doubleclick.net',
        origin: 'Google',
        purpose: 'Eligen qué anuncio mostrarte y miden si funcionó. Solo entran en juego con la personalización activada.',
        duration: 'Definida por Google',
        needed: 'Solo si aceptas los anuncios personalizados',
    },
];

const MONTHS = Math.round(CONSENT_MAX_AGE_SECONDS / (60 * 60 * 24 * 30));

export function CookiePreferences() {
    const { consent, ready, decide, forget } = useConsent();
    const [busy, setBusy] = useState(false);
    const [forgotten, setForgotten] = useState(false);

    const analytics = consent?.analytics ?? false;
    const measure = consent?.measure ?? true;
    const ads = consent?.ads ?? false;

    /* `ads` viaja SIEMPRE, en los tres switches. Es un eje independiente de la
       escalera accept/essential/reject-all: sin reenviar su valor actual,
       tocar cualquiera de los otros dos lo apagaría de rebote. */
    async function apply(choice: Parameters<typeof decide>[0], nextAds: boolean) {
        setBusy(true);
        setForgotten(false);
        try {
            await decide(choice, nextAds);
        } finally {
            setBusy(false);
        }
    }

    /** El peldaño de la escalera que corresponde al estado actual, para poder
     *  cambiar solo el eje publicitario sin tocar la medición. */
    const currentChoice: Parameters<typeof decide>[0] =
        analytics ? 'accept' : measure ? 'essential' : 'reject-all';

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
                        onChange={(event) => apply(event.currentTarget.checked ? 'accept' : 'essential', ads)}
                        label="Recordar mi navegador para saber si vuelvo"
                        description={`Guarda la cookie pio_vid durante ${MONTHS} meses. Es lo que nos permite distinguir entre mil visitas de mil personas y mil visitas de cien personas.`}
                    />

                    <Divider />

                    <Switch
                        checked={measure}
                        disabled={!ready || busy}
                        onChange={(event) => apply(event.currentTarget.checked ? 'essential' : 'reject-all', ads)}
                        label="Contarme en las estadísticas anónimas"
                        description="Medición agregada sin guardar nada en tu dispositivo: el servidor calcula un código que caduca cada 24 horas. Desactívalo si prefieres no aparecer en ninguna cifra."
                    />

                    <Divider />

                    <Switch
                        checked={ads}
                        disabled={!ready || busy}
                        onChange={(event) => apply(currentChoice, event.currentTarget.checked)}
                        label="Anuncios ajustados a mis intereses"
                        description="Los anuncios de Google que sostienen el sitio los verás de todos modos: esto solo decide si Google puede elegirlos según tu navegación. Desactivado, te tocan anuncios genéricos."
                    />

                    {ready && consent === null && (
                        <Text fz="sm" c="dimmed">
                            Aún no has decidido nada. Mientras tanto solo se aplica la medición
                            anónima, que no deja nada en tu dispositivo, y los anuncios que veas
                            no estarán personalizados.
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
                                <Table.Th>Origen</Table.Th>
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
                                    <Table.Td c="dimmed">{cookie.origin}</Table.Td>
                                    <Table.Td c="dimmed">{cookie.purpose}</Table.Td>
                                    <Table.Td c="dimmed">{cookie.duration}</Table.Td>
                                    <Table.Td c="dimmed">{cookie.needed}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>

                <Text fz="sm" c="dimmed" mt="md">
                    Las dos primeras son propias y ninguna sirve para publicidad. Las de Google
                    las pone su sistema de anuncios (AdSense) cuando se carga el bloque del pie
                    de una ficha de juego, y son las únicas de terceros que existen aquí: Play in
                    One no carga Google Analytics ni píxeles de redes sociales. La lista exacta la
                    mantiene Google en{' '}
                    <Anchor href="https://business.safety.google/adscookies/" target="_blank" rel="noopener noreferrer">
                        business.safety.google/adscookies
                    </Anchor>
                    , y puedes revisar o cortar la personalización desde tu propia cuenta en{' '}
                    <Anchor href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">
                        myadcenter.google.com
                    </Anchor>
                    . Detalle completo en la{' '}
                    <Anchor component={Link} href="/privacy">Política de Privacidad</Anchor>.
                </Text>
            </Box>

            <Box className="content-card" p="xl">
                <Title order={2} fz="lg" mb="xs">Borrar mis datos</Title>
                <Text fz="md" c="dimmed" mb="md">
                    Elimina de nuestra base de datos el identificador de este navegador y todo lo
                    asociado a él, y borra las dos cookies propias. Es inmediato y no hace falta
                    que nos escribas. Después de hacerlo:
                </Text>
                <List spacing={4} fz="sm" c="dimmed" mb="lg">
                    <List.Item>Volverás a ser un visitante nuevo y el aviso reaparecerá.</List.Item>
                    <List.Item>
                        Los eventos que ya se registraron sobreviven como cifras sueltas sin nada que
                        apunte a ti: no podemos borrar filas que ya no sabemos que eran tuyas.
                    </List.Item>
                    <List.Item>
                        Las cookies de Google no las controlamos nosotros y este botón no las toca.
                        Se gestionan desde{' '}
                        <Anchor href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">
                            myadcenter.google.com
                        </Anchor>{' '}
                        o borrando los datos del sitio en tu navegador.
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
