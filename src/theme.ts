'use client';

import { Card, createTheme, DEFAULT_THEME, rem, Tooltip, type MantineColorsTuple } from '@mantine/core';
import { brand, darkScale, semantic, type SemanticColor } from '@/lib/colors';

/* Las paletas de estado (`danger`, `success`…) son copias con nombre propio de
   las de Mantine: `color="danger"` dice para qué es el color, y cambiar el tono
   de los errores pasa a ser un cambio de una línea en `lib/colors.ts`. */
const semanticColors = Object.fromEntries(
    Object.entries(semantic).map(([name, base]) => [name, DEFAULT_THEME.colors[base]]),
) as Record<SemanticColor, MantineColorsTuple>;

export const theme = createTheme({
    primaryColor: 'primaryRed',
    colors: { primaryRed: brand.primaryScale, dark: darkScale, ...semanticColors },
    fontFamily: 'var(--font-poppins), Inter, system-ui, sans-serif',
    headings: { fontFamily: 'var(--font-poppins), Inter, system-ui, sans-serif' },
    defaultRadius: 'md',
    cursorType: 'pointer',
    /* Se suman a la escala de Mantine (xs–xl). `2xl`/`3xl`: cifras grandes.
       `2xs`: la separación entre iconos y etiquetas; `section`: entre secciones. */
    fontSizes: { '2xl': rem(28), '3xl': rem(42) },
    spacing: { '2xs': rem(4), section: rem(60) },
    components: {
        /* Las 26 tarjetas del sitio llevaban `withBorder` y el sitio público
           `radius="lg"`: ahora es lo que sale sin escribir nada. El staff
           conserva `radius="md"` explícito. */
        Card: Card.extend({ defaultProps: { withBorder: true, radius: 'lg' } }),
        Tooltip: Tooltip.extend({ defaultProps: { withArrow: true } }),
    },
});
