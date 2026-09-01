import { Box } from '@mantine/core';

/**
 * Texto plegado tras un "ver más", con `<details>/<summary>` nativos.
 *
 * **El texto sigue íntegro en el HTML**, y eso es justo lo que lo hace seguro:
 * un buscador indexa con normalidad lo que hay dentro de un acordeón, y los
 * crawlers de motores generativos leen el HTML crudo, así que un `<details>`
 * cerrado se lee igual que uno abierto.
 *
 * Lo que NO se puede hacer aquí es esconderlo con `display:none` o con el color
 * del fondo: eso es cloaking, y con un `FAQPage` declarado encima expone a una
 * acción manual por desajuste entre el dato estructurado y la página.
 *
 * Nativo y no un componente de Mantine por dos razones: funciona sin
 * JavaScript —la condición en la que leen la página GPTBot y compañía— y los
 * compuestos de Mantine 7 no se pueden renderizar desde un Server Component.
 */
export default function CollapsibleText({
    label,
    children,
    defaultOpen = false,
}: {
    /** Lo único visible con el bloque plegado. Que describa lo que hay dentro. */
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    return (
        <details open={defaultOpen || undefined}>
            <summary
                style={{
                    cursor: 'pointer',
                    fontSize: 'var(--mantine-font-size-sm)',
                    color: 'var(--mantine-color-dimmed)',
                    width: 'fit-content',
                }}
            >
                {label}
            </summary>
            <Box mt="xs" fz="sm" c="dimmed" maw={600} style={{ lineHeight: 1.6 }}>
                {children}
            </Box>
        </details>
    );
}
