import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { getPosts, getTrendingGames, getFeaturedGames } from '@/lib/api';
import type { Post, Game } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { itemListJsonLd } from '@/lib/seo';
import HomeClient from './HomeClient';

// Refresh server-rendered news periodically instead of freezing at build time.
export const revalidate = 300;

// Home inherits its title/canonical from the root layout metadata.
export default async function HomePage() {
    // Las tres secciones son independientes: se piden en paralelo (cada
    // regeneración ISR paga 1 RTT al backend en vez de 3 encadenados) y
    // cada una degrada a vacío por separado si el API falla.
    const [postsResult, trendingResult, featuredResult] = await Promise.allSettled([
        getPosts({ page: 1, ordering: '-published_date' }),
        getTrendingGames(),
        getFeaturedGames(),
    ]);

    /* Una regeneración ISR con una sección caída NO debe llegar a la caché:
       con `stale-while-revalidate` esa portada incompleta se servía hasta la
       siguiente regeneración. Pasó al reiniciar el droplet, donde Docker
       arranca todos los contenedores a la vez sin respetar `depends_on` y el
       frontend regeneró la home mientras el backend migraba. Lanzar hace que
       Next siga sirviendo la última versión buena y reintente en la próxima
       visita. En el build se degrada como antes: ahí no hay versión anterior
       que conservar y lanzar rompería el deploy. */
    const failed = [postsResult, trendingResult, featuredResult].some((r) => r.status === 'rejected');
    if (failed && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
        throw new Error('La portada no se regenera con secciones del backend caídas');
    }

    const posts: Post[] = postsResult.status === 'fulfilled' ? postsResult.value.results : [];
    const trending: Game[] = trendingResult.status === 'fulfilled' ? trendingResult.value.results : [];
    const featured: Game[] = featuredResult.status === 'fulfilled' ? featuredResult.value.results : [];

    // ItemList de lo que la home ya muestra. El Organization/WebSite del layout
    // dice qué es el sitio; esto dice qué hay dentro, con precio y tienda por
    // juego — que es lo que convierte la portada en una respuesta a "¿qué
    // juegos están baratos?" en vez de en una lista de enlaces.
    const jsonLd = [
        ...(featured.length
            ? [itemListJsonLd(featured, { path: '/', name: 'Juegos destacados' })]
            : []),
        ...(trending.length
            ? [itemListJsonLd(trending, { path: '/', name: 'Juegos en tendencia' })]
            : []),
    ];

    return (
        <>
            <HomeClient initialPosts={posts} initialTrending={trending} initialFeatured={featured} />
            {/* Va DESPUÉS del contenido a propósito: colocado delante, el
                carrusel de destacados se descuadraba en mobile y el e2e
                «la tarjeta destacada cabe en el ancho de la pantalla» fallaba.
                No está diagnosticado por qué un <script> vacío de layout
                afecta a esa medición, pero para el JSON-LD la posición en el
                DOM es indiferente, así que no hay motivo para forzarla. */}
            {jsonLd.length > 0 && <JsonLd data={jsonLd} />}
        </>
    );
}
