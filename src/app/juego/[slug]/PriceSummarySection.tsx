import { Box, Text, Title } from '@mantine/core';
import type { monthlyMinimums } from '@/lib/priceSummary';
import { platformLongName, type Platform } from '@/lib/types';
import { formatCLP } from '@/lib/utils';

/**
 * Resumen de precios de la ficha, renderizado en el SERVIDOR.
 *
 * Va desplegado, no tras un `<details>`: es la respuesta que busca quien llega
 * preguntando "¿cuánto cuesta X?", y los crawlers de IA solo leen el HTML
 * inicial. Las frases salen de `priceSummarySentences` —las mismas que abren
 * la meta description y la FAQ—, así que las tres dicen lo mismo.
 *
 * Server Component a propósito: se inyecta en `GameDetailClient` como slot
 * (`summarySlot`) y así no viaja en su bundle. Por lo mismo usa la tabla
 * nativa y no `Table.Tr`: los compuestos de Mantine 7 llegan como `undefined`
 * a un Server Component.
 */
export default function PriceSummarySection({
    sentences,
    monthly,
    platforms,
}: {
    sentences: string[];
    monthly: ReturnType<typeof monthlyMinimums>;
    /** Consolas del juego, para nombrar con su nombre largo el slug que trae
     *  cada fila mensual. */
    platforms: Platform[];
}) {
    if (sentences.length === 0 && monthly.length === 0) return null;

    const platformName = (slug: string) => {
        const platform = platforms.find((p) => p.slug === slug);
        return platform ? platformLongName(platform) : slug;
    };

    return (
        <Box component="section" aria-labelledby="resumen-precios">
            <Title order={2} id="resumen-precios" fz="lg">Resumen de precios</Title>
            {/* El alcance, como rótulo: estas cifras son del catálogo entero y
                la tarjeta «Mejor Precio» de abajo sigue los filtros activos, así
                que pueden no coincidir. */}
            <Text c="dimmed" fz="sm" mb="xs">Todas las tiendas y consolas, con envío incluido.</Text>
            {sentences.map((sentence) => (
                <Text key={sentence} component="p" fz="sm" lh={1.6} mt={0} mb="xs">
                    {sentence}
                </Text>
            ))}
            {monthly.length > 0 && (
                <>
                    <Title order={3} fz="md" mt="md" mb="xs">Precio mínimo por mes</Title>
                    <table className="pio-table">
                        <caption>Mínimo entre todas las consolas, envío incluido</caption>
                        <thead>
                            <tr>
                                <th scope="col">Mes</th>
                                <th scope="col" className="pio-table-num">Precio mínimo</th>
                                <th scope="col">Consola</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthly.map((row) => (
                                <tr key={row.month}>
                                    <td>{row.month}</td>
                                    <td className="pio-table-num">{formatCLP(row.price)}</td>
                                    <td>{platformName(row.platform)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </Box>
    );
}
