import type { Metadata } from 'next';
import NotFoundBody from '@/components/NotFoundBody';

/* 404 propia. La genérica de Next no enlazaba nada: quien llega a una URL
   muerta (un juego fusionado, un enlace viejo) se quedaba sin camino, y un
   crawler también. El status 404 lo pone Next; esto es solo el cuerpo. */

export const metadata: Metadata = {
    title: 'Página no encontrada',
    robots: { index: false, follow: true },
    // Sin canonical: el layout raíz pone `/` por defecto y una 404 que se
    // declara canónica de la home es una señal contradictoria.
    alternates: { canonical: null },
};

export default function NotFound() {
    return <NotFoundBody />;
}
