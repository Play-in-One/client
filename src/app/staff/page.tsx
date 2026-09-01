import type { Metadata } from 'next';
import StaffLoginClient from './StaffLoginClient';

// El login es un Client Component y por eso no puede exportar metadata: este
// envoltorio servidor existe solo para poner el noindex. La ruta no está
// enlazada en ninguna parte y tampoco entra al sitemap, pero sin esto bastaba
// que alguien la compartiera una vez para que acabara indexada.
//
// Deliberadamente NO se añade a robots.txt: ese archivo es público, así que
// listarla ahí delataría la ruta secreta en vez de protegerla.
export const metadata: Metadata = {
    title: 'Acceso',
    robots: { index: false, follow: false },
};

export default function StaffLoginPage() {
    return <StaffLoginClient />;
}
