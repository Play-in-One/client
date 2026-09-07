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

import { DIGITAL_CONDITIONS } from './conditions';

export const PREFS_COOKIE = 'pio_prefs';

/* Un año. La preferencia no caduca sola: quien apagó las importadoras espera
 * seguir sin verlas la próxima vez que entre. */
export const PREFS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConditionFilter = 'all' | 'new' | 'used';

/** Físico ↔ digital. Es el filtro de la barra; la condición vive en el menú de
 *  preferencias porque solo tiene sentido dentro de lo físico. */
export type FormatFilter = 'all' | 'physical' | 'digital';

export interface Prefs {
    condition: ConditionFilter;
    format: FormatFilter;
    /** `false` esconde las tiendas internacionales en toda la plataforma. */
    international: boolean;
}

/* Lo que ve quien nunca tocó nada, y el fallback de cualquier valor corrupto.
 * Coincide con lo que renderiza el servidor cuando no hay cookie, que es lo que
 * mantiene alineados los dos lados de la hidratación. */
export const DEFAULT_PREFS: Prefs = { condition: 'all', format: 'all', international: true };

export function parsePrefs(raw: string | null | undefined): Prefs {
    if (!raw) return DEFAULT_PREFS;
    try {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        return {
            condition:
                parsed.condition === 'new' || parsed.condition === 'used'
                    ? parsed.condition
                    : DEFAULT_PREFS.condition,
            // Una cookie anterior a este campo cae en 'all', que es exactamente
            // como se comportaba antes: no hay que migrar nada ni reescribirla.
            format:
                parsed.format === 'physical' || parsed.format === 'digital'
                    ? parsed.format
                    : DEFAULT_PREFS.format,
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
        prefs.format === DEFAULT_PREFS.format &&
        prefs.international === DEFAULT_PREFS.international
    );
}

/* El formato y la condición son DOS controles pero UN solo campo en el backend
 * (`Product.condition`, que vale new/used/digital/store/key/download). Esta es
 * la única traducción del par a lo que viaja en `?condition=`, y el backend
 * expande el token a las condiciones almacenadas que representa.
 *
 * Con formato digital la condición se IGNORA, no se borra: quien tenía
 * "Usados" y pasa por Digital debe recuperarlo al volver a Físico. Lo que se
 * apaga es el control, no el dato. */
export function conditionParamFor(
    format: FormatFilter,
    condition: ConditionFilter,
): string | undefined {
    if (format === 'digital') return 'digital';
    if (condition !== 'all') return condition;      // nuevo/usado ya es más estrecho
    return format === 'physical' ? 'physical' : undefined;
}

/* Las condiciones ALMACENADAS que el par admite, para quien filtra en memoria
 * (la ficha del juego y /saved) en vez de pedirle a la API. `null` = no acota.
 * Es el gemelo cliente de `models.CONDITION_FAMILIES`. */
export function allowedConditionsFor(
    format: FormatFilter,
    condition: ConditionFilter,
): Set<string> | null {
    const token = conditionParamFor(format, condition);
    if (!token) return null;
    if (token === 'digital') return new Set(DIGITAL_CONDITIONS);
    if (token === 'physical') return new Set(['new', 'used']);
    return new Set([token]);
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
