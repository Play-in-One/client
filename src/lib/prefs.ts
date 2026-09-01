/* Filtros GLOBALES del visitante: la condición (nuevo/usado) y la procedencia
 * de las tiendas. Viven en el navbar, acotan toda la plataforma y se conservan
 * entre visitas.
 *
 * Se guardan en DOS sitios a propósito:
 *
 *   - `localStorage` es la fuente de verdad del cliente, y lo que ya usaba
 *     AppContext antes de que existiera este módulo.
 *   - La cookie `pio_prefs` existe para que las lean el SERVIDOR (el detalle de
 *     juego renderiza ya filtrado) y el script que corre antes de la primera
 *     pintura. `localStorage` no sirve para ninguna de las dos cosas.
 *
 * Igual que `pio_consent`, la cookie es legible por JS a propósito: hay que
 * poder consultarla antes de que React hidrate.
 */

export const PREFS_COOKIE = 'pio_prefs';

/* Un año. La preferencia no caduca sola: quien apagó las importadoras espera
 * seguir sin verlas la próxima vez que entre. */
export const PREFS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConditionFilter = 'all' | 'new' | 'used';

export interface Prefs {
    condition: ConditionFilter;
    /** `false` esconde las tiendas internacionales en toda la plataforma. */
    international: boolean;
}

/* Lo que ve quien nunca tocó nada, y el fallback de cualquier valor corrupto.
 * Coincide con lo que renderiza el servidor cuando no hay cookie, que es lo que
 * mantiene alineados los dos lados de la hidratación. */
export const DEFAULT_PREFS: Prefs = { condition: 'all', international: true };

export function parsePrefs(raw: string | null | undefined): Prefs {
    if (!raw) return DEFAULT_PREFS;
    try {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        return {
            condition:
                parsed.condition === 'new' || parsed.condition === 'used'
                    ? parsed.condition
                    : DEFAULT_PREFS.condition,
            international:
                typeof parsed.international === 'boolean'
                    ? parsed.international
                    : DEFAULT_PREFS.international,
        };
    } catch {
        // Cookie manipulada o de una versión anterior: los defaults nunca fallan.
        return DEFAULT_PREFS;
    }
}

export function isDefaultPrefs(prefs: Prefs): boolean {
    return (
        prefs.condition === DEFAULT_PREFS.condition &&
        prefs.international === DEFAULT_PREFS.international
    );
}

/** El valor de `?seller_scope=` que le toca a la API, o undefined si no acota. */
export function sellerScopeFor(international: boolean): string | undefined {
    return international ? undefined : 'national';
}

/* La escribe el cliente con `document.cookie` y no un Route Handler —a
 * diferencia de `pio_consent`— porque no hay nada que validar en el servidor:
 * es una preferencia de visualización, no un consentimiento. Un round-trip por
 * cada clic del toggle sería puro coste. */
export function writePrefsCookie(prefs: Prefs) {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie =
        `${PREFS_COOKIE}=${encodeURIComponent(JSON.stringify(prefs))}` +
        `; path=/; max-age=${PREFS_MAX_AGE_SECONDS}; samesite=lax${secure}`;
}
