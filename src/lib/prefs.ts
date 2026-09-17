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
export type DigitalFilter = 'all' | 'store' | 'key';

const COMBINED_CONDITIONS: Record<string, readonly string[]> = {
    new_store: ['new', 'store'],
    new_key: ['new', 'key'],
    used_store: ['used', 'store'],
    used_key: ['used', 'key'],
    physical_store: ['new', 'used', 'store'],
    physical_key: ['new', 'used', 'key'],
    new_digital: ['new', 'store', 'key'],
    used_digital: ['used', 'store', 'key'],
};

export interface Prefs {
    condition: ConditionFilter;
    format: FormatFilter;
    digital: DigitalFilter;
    /** `false` esconde las tiendas internacionales en toda la plataforma. */
    international: boolean;
}

/* Lo que ve quien nunca tocó nada, y el fallback de cualquier valor corrupto.
 * Coincide con lo que renderiza el servidor cuando no hay cookie, que es lo que
 * mantiene alineados los dos lados de la hidratación. */
export const DEFAULT_PREFS: Prefs = { condition: 'all', format: 'all', digital: 'all', international: true };

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
            digital:
                parsed.digital === 'store' || parsed.digital === 'key'
                    ? parsed.digital
                    : DEFAULT_PREFS.digital,
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
        prefs.digital === DEFAULT_PREFS.digital &&
        prefs.international === DEFAULT_PREFS.international
    );
}

/* El formato y la condición son DOS controles pero UN solo campo en el backend
 * (`Product.condition`, que vale new/used/store/key). Esta es
 * la única traducción del par a lo que viaja en `?condition=`, y el backend
 * expande el token a las condiciones almacenadas que representa.
 *
 * Un subtipo digital exacto manda mientras el formato admita digitales
 * (Todo/Digital); al volver a Físico se recupera el estado nuevo/usado que se
 * había guardado. */
export function conditionParamFor(
    format: FormatFilter,
    condition: ConditionFilter,
    digital: DigitalFilter = 'all',
): string | undefined {
    if (format === 'all') {
        if (condition === 'all' && digital === 'all') return undefined;
        if (condition === 'all') return `physical_${digital}`;
        if (digital === 'all') return `${condition}_digital`;
        return `${condition}_${digital}`;
    }
    if (format === 'digital' && digital !== 'all') return digital;
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
    digital: DigitalFilter = 'all',
): Set<string> | null {
    const token = conditionParamFor(format, condition, digital);
    if (!token) return null;
    if (token === 'digital') return new Set(DIGITAL_CONDITIONS);
    if (token === 'physical') return new Set(['new', 'used']);
    if (COMBINED_CONDITIONS[token]) return new Set(COMBINED_CONDITIONS[token]);
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
