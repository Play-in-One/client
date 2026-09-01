import { Box, Container, Title } from '@mantine/core';
import type { FaqEntry } from '@/lib/seo';

/**
 * Bloque de preguntas frecuentes, renderizado en el SERVIDOR.
 *
 * Usa `<details>/<summary>` nativos en vez del Accordion de Mantine por dos
 * razones que apuntan al mismo sitio: los componentes compuestos de Mantine 7
 * llegan como `undefined` a un Server Component, y `<details>` funciona sin
 * JavaScript — que es exactamente la condición en la que leen la página
 * GPTBot, ClaudeBot y PerplexityBot. Con un acordeón de React el texto seguiría
 * estando en el HTML, pero aquí no hay ninguna razón para pagar ese JS.
 *
 * El texto debe salir del mismo sitio que alimenta el FAQPage de schema.org:
 * un dato estructurado que afirme algo que la página no dice es exactamente lo
 * que penalizan los buscadores.
 */
export default function FaqSection({
    entries,
    title = 'Preguntas frecuentes',
    id,
    collapsible = false,
    size = 'xl',
}: {
    entries: FaqEntry[];
    title?: string;
    id?: string;
    /** Ancho del Container. Debe coincidir con el de la página que lo monta:
     *  con el 'xl' por defecto, la FAQ de la ficha de juego (que va en 'lg')
     *  quedaba desalineada a la izquierda del resto del contenido. */
    size?: string;
    /**
     * Pliega la sección entera tras su título, dejando una sola línea a la
     * vista. El contenido sigue en el HTML, así que ni el indexado ni el
     * FAQPage se resienten: un buscador lee con normalidad lo que hay dentro
     * de un acordeón. Lo que sí estaría prohibido es esconderlo con
     * `display:none` — eso es cloaking, y con un FAQPage declarado encima
     * expone a una acción manual por desajuste con la página.
     *
     * Se usa en la ficha de juego, donde la FAQ es secundaria. En `/faq` la
     * sección ES la página, así que va desplegada.
     */
    collapsible?: boolean;
}) {
    if (entries.length === 0) return null;

    const list = (
        <Box
            style={{
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 'var(--mantine-radius-lg)',
                overflow: 'hidden',
            }}
        >
            {entries.map((entry, i) => (
                <details
                    key={entry.question}
                    style={{
                        borderTop: i === 0 ? 'none' : '1px solid var(--mantine-color-default-border)',
                    }}
                >
                    <summary
                        style={{
                            cursor: 'pointer',
                            padding: 'var(--mantine-spacing-md)',
                            fontWeight: 600,
                            fontSize: 'var(--mantine-font-size-md)',
                            listStyle: 'revert',
                        }}
                    >
                        {entry.question}
                    </summary>
                    <Box px="md" pb="md" c="dimmed" fz="sm" style={{ lineHeight: 1.6 }}>
                        {entry.answer}
                    </Box>
                </details>
            ))}
        </Box>
    );

    return (
        <Container size={size} py="xl" id={id}>
            {collapsible ? (
                <details>
                    <summary
                        style={{
                            cursor: 'pointer',
                            width: 'fit-content',
                            marginBottom: 'var(--mantine-spacing-md)',
                        }}
                    >
                        <Title order={2} fz={{ base: 'h4', sm: 'h3' }} component="span">
                            {title}
                        </Title>
                    </summary>
                    {list}
                </details>
            ) : (
                <>
                    <Title order={2} fz={{ base: 'h3', sm: 'h2' }} mb="md">
                        {title}
                    </Title>
                    {list}
                </>
            )}
        </Container>
    );
}
