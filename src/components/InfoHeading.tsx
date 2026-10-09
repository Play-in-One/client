import type { ReactNode } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';

/**
 * Encabezado con una (i) que despliega un texto explicativo debajo.
 *
 * Mismo patrón que la (i) de «Calificaciones» en la ficha: un `<details>`
 * nativo cuyo `<summary>` es el propio encabezado. El texto plegado sigue
 * entero en el HTML inicial —lo único que leen Google y los crawlers de IA sin
 * JavaScript—, así que plegarlo no le resta valor SEO/GEO; un tooltip o un
 * popover, en cambio, lo montaría solo al abrirlo y no existiría para ellos.
 *
 * Sin `'use client'` ni estado: sirve en Server Components y el icono cambia
 * de color por CSS con el atributo `open` (`.pio-details-inline`).
 */
export default function InfoHeading({
    heading,
    label,
    children,
}: {
    /** El encabezado visible (normalmente el `<Title order={1}>` de la página). */
    heading: ReactNode;
    /** Texto accesible del desplegable, p. ej. «Resumen de la consola». */
    label: string;
    children: ReactNode;
}) {
    return (
        <details className="pio-details pio-details-inline pio-info-heading">
            <summary aria-label={label} title={label}>
                {heading}
                <IconInfoCircle size={22} className="pio-details-info" aria-hidden />
            </summary>
            <div className="pio-info-heading-body">{children}</div>
        </details>
    );
}
