/* El vocabulario de condición del CATÁLOGO (no el del filtro del visitante,
 * que vive en `prefs.ts`).
 *
 * El backend guarda de dónde sale una descarga —`store` es la tienda oficial,
 * `key` un código de canje— porque no dan la misma garantía ni el mismo
 * proceso de compra. La UI las enseña a todas como un único "Digital": quien
 * compara precios no necesita esa distinción para elegir, y abrirla en la
 * tabla de ofertas gastaría una columna en un matiz. El matiz sobrevive en el
 * tooltip del 💾, que es donde se pide, no donde se impone.
 */

/** Las condiciones que son una descarga. Gemelo de `models.DIGITAL_CONDITIONS`. */
export const DIGITAL_CONDITIONS = ['digital', 'store', 'key', 'download'] as const;

const DIGITAL_SET: ReadonlySet<string> = new Set(DIGITAL_CONDITIONS);

/** Bucket al que pertenece una condición almacenada. Es lo que hace falta para
 *  AGRUPAR o ETIQUETAR; `isDigital` solo sirve para decidir si se pinta el 💾.
 *  Comparar `condition === 'digital'` por igualdad es siempre un bug: se come
 *  las ofertas `store` y `key`. */
export function conditionBucket(condition?: string | null): 'new' | 'used' | 'digital' {
    if (condition && DIGITAL_SET.has(condition)) return 'digital';
    return condition === 'used' ? 'used' : 'new';
}

export function isDigital(condition?: string | null): boolean {
    return !!condition && DIGITAL_SET.has(condition);
}

/** Indexados por BUCKET, no por valor crudo: así `store` y `key` rotulan
 *  "Digital" sin entradas duplicadas ni un `?? 'gray'` de rescate. */
export const CONDITION_LABEL: Record<'new' | 'used' | 'digital', string> = {
    new: 'Nuevo',
    used: 'Usado',
    digital: 'Digital',
};

export const CONDITION_BADGE_COLOR: Record<'new' | 'used' | 'digital', string> = {
    new: 'blue',
    used: 'yellow',
    digital: 'grape',
};

/** El matiz, solo para el tooltip: de dónde sale exactamente la descarga. */
export const DIGITAL_VARIANT_LABEL: Record<string, string> = {
    store: 'Digital · tienda oficial',
    key: 'Digital · código de canje',
    download: 'Digital · descarga',
    digital: 'Juego digital (descarga)',
};

/** La etiqueta visible de una condición almacenada, ya colapsada. */
export function conditionLabelFor(condition?: string | null): string {
    return CONDITION_LABEL[conditionBucket(condition)];
}
