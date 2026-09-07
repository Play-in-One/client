'use client';

import Link from 'next/link';
import { Alert, Anchor, Box, Container, List, Text, Title } from '@mantine/core';

import { POLICY_VERSION } from '@/lib/consent';
import { DataTable, type DataRow } from './DataTable';

/* Todo el cuerpo de la política es cliente porque los componentes compuestos
   de Mantine (List.Item, Table.Tr, ...) llegan como `undefined` a un Server
   Component y el render revienta. page.tsx sigue siendo servidor y conserva
   la metadata, que es lo que necesitan los buscadores. */

const LAST_UPDATED = '7 de septiembre de 2026';

const DATA_ROWS: readonly DataRow[] = [
    {
        what: 'Eventos de navegación',
        detail: 'Páginas vistas, juegos consultados, clics hacia tiendas, búsquedas y filtros usados.',
        why: 'Saber qué juegos y tiendas interesan, y qué falta en el catálogo.',
        basis: 'Consentimiento (cookie de analítica) o interés legítimo (medición anónima agregada).',
        keeps: '180 días. Las búsquedas se borran a los 30 días.',
    },
    {
        what: 'Tiempos de carga',
        detail: 'Cuánto tardó en cargar cada página en tu dispositivo, con el tipo de aparato y de conexión. No incluye nada de lo que hicieras en ella.',
        why: 'Detectar qué páginas van lentas y para quién, que es lo único que permite arreglarlo.',
        basis: 'Consentimiento (cookie de analítica) o interés legítimo (medición anónima agregada).',
        keeps: '45 días en detalle. Los promedios diarios se conservan sin límite.',
    },
    {
        what: 'Identificador de visitante',
        detail: 'Un número aleatorio guardado en la cookie pio_vid. No contiene tu nombre ni tu correo.',
        why: 'Distinguir visitas nuevas de visitas que vuelven, sin saber quién eres.',
        basis: 'Consentimiento.',
        keeps: '13 meses desde que aceptaste, o hasta que borres la cookie.',
    },
    {
        what: 'Registro de tu decisión sobre cookies',
        detail: 'Qué aceptaste, cuándo, y un resumen cifrado (hash) de tu conexión.',
        why: 'Poder acreditar que tu consentimiento existió, como exige la ley.',
        basis: 'Obligación legal.',
        keeps: 'Mientras dure el tratamiento que autorizaste.',
    },
    {
        what: 'Datos que recoge Google para los anuncios',
        detail: 'Al cargarse el bloque de anuncios del pie de una ficha de juego, Google recibe tu dirección IP, tu navegador y la página en la que estás, y guarda cookies propias suyas. Nosotros no vemos nada de eso.',
        why: 'Elegir qué anuncio mostrarte, no repetírtelo y detectar clics fraudulentos.',
        basis: 'Interés legítimo para los anuncios genéricos; consentimiento para que se elijan según tu navegación.',
        keeps: 'Lo decide Google, no nosotros. Sus plazos están en su política de privacidad.',
    },
    {
        what: 'Mensajes de contacto',
        detail: 'El nombre, correo y mensaje que escribes en el formulario de contacto.',
        why: 'Responderte.',
        basis: 'Consentimiento, al enviarlo tú.',
        keeps: 'Hasta que la consulta queda resuelta.',
    },
];

export function PrivacyContent() {
    return (
        <Container size="md" py={60}>
            <Title order={1} mb="xs" ta="center">Política de Privacidad</Title>
            <Text fz="sm" c="dimmed" ta="center" mb="xl">
                Versión {POLICY_VERSION} · Última actualización: {LAST_UPDATED}
            </Text>

            <Box className="content-card" p="xl">
                <Text fz="md" c="dimmed" mb="lg">
                    Play in One es un comparador de precios de videojuegos. No vendemos nada y no
                    tenemos cuentas de usuario. Lo que medimos es cuánta gente usa el sitio y qué
                    busca, para decidir qué mejorar; y mostramos anuncios de Google en un punto
                    concreto de las fichas de juego, que es lo que paga los servidores. Esta página
                    explica exactamente qué se guarda y qué no.
                </Text>

                <Title order={2} fz="lg" mb="xs">Lo esencial en cuatro puntos</Title>
                <List spacing="xs" mb="lg" c="dimmed">
                    <List.Item>No guardamos tu dirección IP en ninguna parte.</List.Item>
                    <List.Item>
                        Nuestra analítica es propia: no usamos Google Analytics ni ninguna
                        herramienta de terceros para medir. El único tercero que interviene es
                        Google, y solo para los anuncios — ver el punto 5.
                    </List.Item>
                    <List.Item>No vendemos ni cedemos datos a nadie.</List.Item>
                    <List.Item>Puedes navegar sin aceptar ninguna cookie y el sitio funciona igual.</List.Item>
                </List>

                <Title order={2} fz="lg" mb="xs">1. Quién es responsable</Title>
                <Text fz="md" c="dimmed" mb="lg">
                    Play in One, proyecto startup con sede en Chile. Para cualquier
                    asunto relacionado con tus datos puedes escribirnos desde{' '}
                    <Anchor component={Link} href="/contact">la página de contacto</Anchor>.
                </Text>

                <Title order={2} fz="lg" mb="xs">2. Qué datos tratamos</Title>
                <Text fz="md" c="dimmed" mb="md">
                    Ninguno de estos datos permite saber tu nombre. No pedimos registro y no hay
                    cuentas de usuario en el sitio.
                </Text>
                <Box mb="lg">
                    <DataTable rows={DATA_ROWS} />
                </Box>

                <Title order={2} fz="lg" mb="xs">3. Cómo contamos visitas sin identificarte</Title>
                <Text fz="md" c="dimmed" mb="md">
                    Si no aceptas la cookie de analítica, seguimos necesitando saber cuánta gente
                    entró — pero no quién. Para eso el servidor calcula un código a partir de tu
                    conexión y tu navegador, mezclado con una clave que cambia cada día. Ese código
                    es lo único que se guarda: la dirección IP y el navegador se descartan en el
                    acto y nunca llegan a la base de datos.
                </Text>
                <Text fz="md" c="dimmed" mb="lg">
                    Como la clave cambia a medianoche, el código de hoy no se parece al de mañana.
                    Sirve para contar cuántas personas distintas entraron hoy, y para nada más: no
                    permite reconocerte al día siguiente ni reconstruir tu historial. No se guarda
                    nada en tu dispositivo.
                </Text>

                <Alert variant="light" color="blue" title="Somos transparentes con esto" mb="lg">
                    <Text fz="sm">
                        Entendemos que esta medición mínima entra dentro de nuestro interés legítimo
                        en saber si el sitio se usa, porque es anónima, agregada y no deja nada en tu
                        equipo. Es una interpretación razonable, pero no indiscutible. Si prefieres
                        no aparecer en ninguna cifra, puedes desactivarla por completo en{' '}
                        <Anchor component={Link} href="/cookies">preferencias de cookies</Anchor>.
                    </Text>
                </Alert>

                <Title order={2} fz="lg" mb="xs">4. Qué NO hacemos</Title>
                <List spacing="xs" mb="lg" c="dimmed">
                    <List.Item>No construimos perfiles publicitarios nuestros ni tomamos decisiones automatizadas sobre ti. Lo que Google haga por su cuenta para elegir un anuncio se explica en el punto 5, y puedes apagarlo.</List.Item>
                    <List.Item>No rastreamos tu actividad en otros sitios web ni cruzamos lo que haces aquí con nada de fuera.</List.Item>
                    <List.Item>No compartimos datos con las tiendas a las que enlazamos. Cuando haces clic en una oferta, contamos el clic de nuestro lado; a la tienda no le mandamos nada sobre ti. Lo que ocurra ya en su sitio se rige por la política de esa tienda.</List.Item>
                    <List.Item>No guardamos lo que buscas si parece un dato personal: si escribes un correo o un teléfono en el buscador, la búsqueda se descarta sin guardarse.</List.Item>
                    <List.Item>No le pasamos a Google nada de lo que medimos: ni tus búsquedas, ni los juegos que miras, ni tu identificador de visitante.</List.Item>
                </List>

                <Title order={2} fz="lg" mb="xs">5. Publicidad</Title>
                <Text fz="md" c="dimmed" mb="md">
                    El sitio muestra anuncios de <b>Google AdSense</b> en un único lugar: un bloque
                    al final de la ficha de cada juego, por debajo de «Otros juegos populares». No
                    hay anuncios en la portada, ni en el buscador, ni intercalados con la tabla de
                    precios. Es lo que financia los servidores y el scraping diario de tiendas.
                </Text>
                <Text fz="md" c="dimmed" mb="md">
                    Cuando ese bloque se carga, Google actúa como responsable de su propio
                    tratamiento: recibe tu dirección IP, tu navegador y la dirección de la página, y
                    puede guardar cookies suyas en tu dispositivo. Nosotros no vemos esos datos ni
                    tenemos acceso a ellos.
                </Text>
                <Text fz="md" c="dimmed" mb="md">
                    <b>Por defecto los anuncios no están personalizados</b>: se eligen por el
                    contenido de la página, no por ti. Solo si lo activas expresamente —el botón
                    «Aceptar» del aviso de cookies, o el interruptor correspondiente en{' '}
                    <Anchor component={Link} href="/cookies">preferencias de cookies</Anchor>— Google
                    puede elegirlos según tu navegación. Puedes cambiar de opinión cuando quieras y
                    se aplica a partir de la siguiente página que cargues.
                </Text>
                <List spacing="xs" mb="lg" c="dimmed">
                    <List.Item>
                        Cómo usa Google los datos de los sitios que usan su publicidad:{' '}
                        <Anchor href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
                            policies.google.com/technologies/partner-sites
                        </Anchor>
                    </List.Item>
                    <List.Item>
                        Controlar la personalización desde tu propia cuenta de Google:{' '}
                        <Anchor href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">
                            myadcenter.google.com
                        </Anchor>
                    </List.Item>
                </List>
                <Text fz="md" c="dimmed" mb="lg">
                    No mostramos anuncios a quien navega desde el Espacio Económico Europeo o el
                    Reino Unido: allí la publicidad exige un sistema de consentimiento certificado
                    que no tenemos montado, así que el bloque sencillamente no se carga.
                </Text>

                <Title order={2} fz="lg" mb="xs">6. Tus derechos</Title>
                <Text fz="md" c="dimmed" mb="md">
                    Puedes pedir acceso a tus datos, su rectificación, su cancelación y oponerte a
                    su tratamiento. Como no tenemos cuentas de usuario, lo único que vincula unos
                    datos contigo es la cookie de tu navegador, así que:
                </Text>
                <List spacing="xs" mb="lg" c="dimmed">
                    <List.Item>
                        <b>Borrado inmediato:</b> el botón «Borrar mis datos» de{' '}
                        <Anchor component={Link} href="/cookies">preferencias de cookies</Anchor>{' '}
                        elimina tu identificador y todo lo asociado a él, sin trámite ni espera.
                    </List.Item>
                    <List.Item>
                        <b>Cualquier otra petición:</b> escríbenos desde{' '}
                        <Anchor component={Link} href="/contact">contacto</Anchor>. Ten en cuenta
                        que sin tu identificador no podemos localizar unos datos que, por diseño, no
                        están vinculados a ninguna persona.
                    </List.Item>
                    <List.Item>
                        <b>Los datos que tenga Google</b> no los podemos borrar nosotros: se
                        gestionan en{' '}
                        <Anchor href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">
                            myadcenter.google.com
                        </Anchor>{' '}
                        o borrando los datos del sitio desde tu navegador.
                    </List.Item>
                    <List.Item>
                        Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante
                        la autoridad de protección de datos que corresponda.
                    </List.Item>
                </List>

                <Title order={2} fz="lg" mb="xs">7. Dónde se guardan</Title>
                <Text fz="md" c="dimmed" mb="lg">
                    Todo lo que medimos vive en nuestros propios servidores, con acceso restringido
                    al equipo del proyecto: no hay ningún proveedor de analítica de por medio. Los
                    datos que recoge Google para los anuncios los guarda Google en su propia
                    infraestructura, y ahí ni entramos ni podemos entrar.
                </Text>

                <Title order={2} fz="lg" mb="xs">8. Cambios en esta política</Title>
                <Text fz="md" c="dimmed">
                    Si cambiamos algo importante, subimos el número de versión y el aviso de
                    cookies vuelve a aparecer para que decidas de nuevo. Los cambios menores se
                    reflejan en la fecha de actualización.
                </Text>
            </Box>
        </Container>
    );
}
