import { getSurveys } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import type { Survey } from '@/lib/types';
import { EncuestasClient } from './EncuestasClient';

// Cambia solo cuando el staff abre o cierra una encuesta, y eso revalida la
// ruta al instante (signal de surveys → /api/revalidate). 5 min es el respaldo.
export const revalidate = 300;

async function fetchSurveys(): Promise<Survey[]> {
    try {
        return await getSurveys();
    } catch {
        return [];
    }
}

export const metadata = buildMetadata({
    title: 'Encuestas',
    description: 'Ayúdanos a mejorar Play in One respondiendo encuestas cortas y anónimas de un minuto.',
    path: '/encuestas',
});

export default async function EncuestasPage() {
    const surveys = await fetchSurveys();
    return <EncuestasClient surveys={surveys} />;
}
