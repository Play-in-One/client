import { Box, Text, Title } from '@mantine/core';
import type { monthlyMinimums } from '@/lib/priceSummary';
import { platformLongName, type Platform } from '@/lib/types';
import { formatCLP } from '@/lib/utils';

/**
 * Resumen de precios de la ficha, renderizado en el SERVIDOR.
 *
 * Vive dentro de la tarjeta de información, tras un `<details>` nativo que
 * pone `GameInfoCardBody`: su `<summary>` es la fila «Calificaciones» con una
 * (i), o la fila «Resumen de precios» si el juego no tiene calificaciones
 * (entonces `heading` va en falso). Plegado sigue en el HTML inicial, que es
 * lo único que leen los crawlers de IA; las frases salen de
 * `priceSummarySentences` —las mismas que abren la meta description y la
 * FAQ—, así que las tres dicen lo mismo.
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
    heading = true,
}: {
    sentences: string[];
    monthly: ReturnType<typeof monthlyMinimums>;
    /** Consolas del juego, para nombrar con su nombre largo el slug que trae
     *  cada fila mensual. */
    platforms: Platform[];
    /** Falso cuando el `<summary>` que lo despliega ya dice «Resumen de
     *  precios» (la fila propia sin calificaciones). */
    heading?: boolean;
}) {
    if (sentences.length === 0 && monthly.length === 0) return null;

    const platformName = (slug: string) => {
        const platform = platforms.find((p) => p.slug === slug);
        return platform ? platformLongName(platform) : slug;
    };

    return (
        <Box mt="sm" mb={heading ? 'md' : undefined}>
            {heading && <Title order={3} fz="md" mb={4}>Resumen de precios</Title>}
            {/* El alcance, como rótulo: estas cifras son del catálogo entero y
                la tarjeta «Mejor Precio» sigue los filtros activos, así que
                pueden no coincidir. */}
            <Text c="dimmed" fz="sm" mb="xs">Todas las tiendas y consolas, con envío incluido.</Text>
            {sentences.map((sentence) => (
                <Text key={sentence} component="p" fz="sm" lh={1.6} mt={0} mb="xs">
                    {sentence}
                </Text>
            ))}
            {monthly.length > 0 && (
                <>
                    <Title order={4} fz="sm" mt="md" mb="xs">Precio mínimo por mes</Title>
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
