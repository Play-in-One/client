import type { Metadata } from 'next';

import { buildMetadata } from '@/lib/seo';
import { PrivacyContent } from './PrivacyContent';

/* Política de Privacidad.
 *
 * PLANTILLA PENDIENTE DE REVISIÓN LEGAL. El contenido describe con exactitud
 * lo que el código hace hoy, pero la identificación del responsable y la
 * redacción de los derechos deben validarse con un abogado antes de que la
 * Ley 21.719 entre en vigencia (1 de diciembre de 2026).
 *
 * Los plazos de conservación citados en el texto son un compromiso público que
 * el backend cumple con `manage.py purge_analytics`. Si cambian las variables
 * ANALYTICS_*_RETENTION_DAYS, el texto tiene que cambiar en el mismo commit.
 */

export const metadata: Metadata = buildMetadata({
    title: 'Política de Privacidad',
    description:
        'Qué datos trata Play in One, con qué finalidad, cuánto tiempo los guarda y cómo ejercer tus derechos.',
    path: '/privacy',
});

export default function PrivacyPage() {
    return <PrivacyContent />;
}
