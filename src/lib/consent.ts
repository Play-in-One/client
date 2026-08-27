/* Preferencia de medición del visitante.
 *
 * PIO mide en dos niveles (ver el plan de analítica y /cookies):
 *
 *   - `analytics: false` — el servidor cuenta la visita con un hash derivado
 *     de IP y navegador que rota cada 24 h. No escribe nada en el dispositivo
 *     y no permite seguir a nadie de un día para otro.
 *   - `analytics: true`  — se emite la cookie `pio_vid`, un identificador
 *     aleatorio que permite saber si alguien vuelve.
 *
 * `measure: false` apaga incluso el primer nivel: es el opt-out total del
 * panel de /cookies, para quien no quiera aparecer en ninguna cifra.
 */

export const CONSENT_COOKIE = 'pio_consent';
export const VISITOR_COOKIE = 'pio_vid';

/* Versión de la política. Subirla hace reaparecer el banner: quien aceptó la
 * versión anterior no ha aceptado esta. Debe cambiarse en el mismo commit que
 * modifique /privacy o /cookies de forma sustantiva. */
export const POLICY_VERSION = '1.0';

/* 13 meses, el máximo habitual para una cookie analítica. Es un plazo fijo:
 * la cookie no se renueva al navegar, así que el consentimiento se vuelve a
 * pedir un año después aunque la persona siga viniendo. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 395;

export interface ConsentState {
    /** Versión de la política que se aceptó o rechazó. */
    v: string;
    /** Cookie de visitante y medición de retorno. */
    analytics: boolean;
    /** Medición anónima agregada, sin almacenamiento en el dispositivo. */
    measure: boolean;
    /** Marca de tiempo ISO de la decisión. */
    ts: string;
}

export type ConsentChoice = 'accept' | 'essential' | 'reject-all';

export function buildConsent(choice: ConsentChoice): ConsentState {
    return {
        v: POLICY_VERSION,
        analytics: choice === 'accept',
        measure: choice !== 'reject-all',
        ts: new Date().toISOString(),
    };
}

export function readCookie(name: string, jar?: string): string | null {
    const source = jar ?? (typeof document === 'undefined' ? '' : document.cookie);
    for (const chunk of source.split('; ')) {
        const separator = chunk.indexOf('=');
        if (separator > 0 && chunk.slice(0, separator) === name) {
            return decodeURIComponent(chunk.slice(separator + 1));
        }
    }
    return null;
}

/** Estado guardado, o `null` si no hay decisión válida para la versión actual. */
export function parseConsent(raw: string | null): ConsentState | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<ConsentState>;
        if (typeof parsed.analytics !== 'boolean' || parsed.v !== POLICY_VERSION) return null;
        return {
            v: parsed.v,
            analytics: parsed.analytics,
            // `measure` es posterior al primer diseño de la cookie: si falta,
            // se asume activo, que es el nivel por defecto de la política.
            measure: parsed.measure !== false,
            ts: typeof parsed.ts === 'string' ? parsed.ts : '',
        };
    } catch {
        return null;
    }
}
