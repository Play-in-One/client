import type { Metadata } from 'next';
import { Container, Text, Title } from '@mantine/core';
import FaqSection from '@/components/FaqSection';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, breadcrumbJsonLd, faqJsonLd, type FaqEntry } from '@/lib/seo';

/**
 * Preguntas sobre PIO, no sobre un juego.
 *
 * Las respuestas están redactadas para ser citadas enteras: cada una se
 * sostiene fuera de su contexto, que es como las lee un motor generativo. La
 * del envío es la que más importa — explica por qué la cifra de PIO no coincide
 * con la de la tienda, que es la duda con la que llega la gente.
 *
 * Es contenido escrito a mano a propósito: describe reglas del producto, no
 * datos del catálogo, así que nada aquí puede derivarse de la API.
 */
const FAQ: FaqEntry[] = [
    {
        question: '¿Qué es Play in One?',
        answer:
            'Play in One (PIO) es un comparador de precios de videojuegos enfocado en Chile. ' +
            'Reúne las ofertas de decenas de tiendas chilenas e importadoras y muestra, para ' +
            'cada juego y cada consola, cuál es la más barata y en qué tienda se consigue. ' +
            'PIO no vende juegos: la compra se hace siempre en la tienda.',
    },
    {
        question: '¿De dónde salen los precios?',
        answer:
            'De los sitios públicos de las tiendas, revisados automáticamente todos los días. ' +
            'Cada precio guarda la fecha en que se registró, y esa fecha se muestra junto a la ' +
            'oferta. Un precio puede cambiar en la tienda antes de que PIO lo vuelva a revisar, ' +
            'así que el precio final es siempre el que aparece en la tienda al pagar.',
    },
    {
        question: '¿Cada cuánto se actualizan?',
        answer:
            'El catálogo se revisa a diario. Solo se guarda un punto nuevo en el historial cuando ' +
            'el precio efectivamente cambia, así que el gráfico de un juego muestra cambios ' +
            'reales y no una línea de mediciones repetidas.',
    },
    {
        question: '¿Qué significa que una tienda sea internacional?',
        answer:
            'Que vende por importación: el juego viene de fuera de Chile. Se marcan con el ícono ' +
            '🌐 y su envío promedio, que suele ser el más alto, ya viene sumado al precio que se ' +
            'muestra. Se pueden ocultar por completo desde las preferencias del sitio.',
    },
    {
        question: '¿Qué quiere decir que un juego esté "nuevo", "usado" o "digital"?',
        answer:
            'Es la condición con la que la tienda publica esa oferta concreta. Un mismo juego ' +
            'puede tener las tres a distinto precio, y se pueden filtrar por separado: el precio ' +
            'más barato de un juego usado no compite contra el de uno sellado.',
    },
    {
        question: '¿Por qué un juego dejó de aparecer para cierta consola?',
        answer:
            'Porque se agotó su última oferta en stock para esa consola. Las consolas de un juego ' +
            'se derivan de las ofertas disponibles, no se asignan a mano, así que la etiqueta ' +
            'vuelve sola en cuanto reaparece una oferta.',
    },
    {
        question: '¿PIO vende juegos o cobra comisión?',
        answer:
            'No vende. PIO compara y enlaza a la tienda; la compra, el pago, el despacho y la ' +
            'garantía son responsabilidad de la tienda.',
    },
];

export const metadata: Metadata = buildMetadata({
    title: 'Preguntas frecuentes',
    description:
        'Cómo funciona Play in One: de dónde salen los precios, por qué incluyen el envío ' +
        'promedio, cada cuánto se actualizan y qué significa cada condición.',
    path: '/faq',
});

export default function FaqPage() {
    return (
        <>
            <JsonLd
                data={[
                    faqJsonLd(FAQ, '/faq'),
                    breadcrumbJsonLd([
                        { name: 'Inicio', path: '/' },
                        { name: 'Preguntas frecuentes', path: '/faq' },
                    ]),
                ]}
            />
            <Container size="xl" pt="xl">
                <Title order={1} fz={{ base: 28, md: 36 }} fw={800} mb="sm">
                    Preguntas frecuentes
                </Title>
                <Text c="dimmed" lh={1.6} maw={700}>
                    Cómo funciona Play in One, de dónde salen los precios y qué significa cada cosa
                    que se muestra junto a una oferta.
                </Text>
            </Container>
            <FaqSection entries={FAQ} title="Sobre Play in One" />
        </>
    );
}
