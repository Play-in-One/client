/* Colapsa una ruta concreta a la plantilla de su ruta en el App Router.

   `/juego/dragon-ball-fighterz-13728` → `/juego/[slug]`.

   Espejo de `backend/analytics/paths.py`, que vuelve a normalizar lo que llega
   —el endpoint es público y no puede fiarse del cliente—. Se hace también aquí
   para no mandar por la red el slug de cada juego que alguien visita: la
   plantilla es lo único que se va a guardar.

   Sin este colapso, medir "por página" no agruparía nada: cada uno de los
   ~9.800 juegos del catálogo abriría su propia fila. */

const ROUTE_PATTERNS: ReadonlyArray<readonly [readonly string[], string]> = [
    [['juego', '*'], '/juego/[slug]'],
    [['game', '*'], '/game/[id]'],
    [['juegos', '*', 'pagina', '*'], '/juegos/[slug]/pagina/[page]'],
    [['juegos', '*'], '/juegos/[slug]'],
    [['store', '*'], '/store/[id]'],
    [['blog', '*'], '/blog/[id]'],
];

export function routePattern(pathname: string): string {
    const clean = (pathname || '').split('?')[0].split('#')[0];
    if (!clean.startsWith('/')) return '';

    const segments = clean.split('/').filter(Boolean);
    if (segments.length === 0) return '/';

    for (const [pattern, template] of ROUTE_PATTERNS) {
        if (pattern.length !== segments.length) continue;
        if (pattern.every((p, i) => p === '*' || p === segments[i])) return template;
    }

    // Genérico: cualquier segmento puramente numérico es un id.
    return '/' + segments.map((s) => (/^\d+$/.test(s) ? '[id]' : s)).join('/');
}
