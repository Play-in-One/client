import type { Metadata } from 'next';
import DealsLanding, { buildDealsMetadata } from './DealsLanding';

/**
 * /ofertas — los juegos que hoy están al menos 15% bajo su precio típico.
 *
 * 1 h es solo la red de seguridad: la frescura real la da `build_daily_deals`,
 * que revalida esta ruta (y las de cada consola) en cuanto escribe la tanda
 * del día.
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
    return buildDealsMetadata();
}

export default async function DealsPage() {
    return <DealsLanding />;
}
