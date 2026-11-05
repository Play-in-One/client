/* El vocabulario de condición del CATÁLOGO (no el del filtro del visitante,
 * que vive en `prefs.ts`).
 *
 * El backend guarda de dónde sale una descarga —`store` es la tienda oficial,
 * `key` un código de canje— porque no dan la misma garantía ni el mismo
 * proceso de compra. La UI conserva la familia "Digital" para filtros
 * agrupados, y muestra el tipo exacto en cada oferta.
 */

/** Las condiciones que son una descarga. Gemelo de `models.DIGITAL_CONDITIONS`. */
export const DIGITAL_CONDITIONS = ['store', 'key'] as const;

const DIGITAL_SET: ReadonlySet<string> = new Set(DIGITAL_CONDITIONS);

/** Bucket al que pertenece una condición almacenada. Es lo que hace falta para
 *  AGRUPAR; `isDigital` decide si pertenece a la familia digital.
 *  Comparar `condition === 'digital'` por igualdad es siempre un bug: se come
 *  las ofertas `store` y `key`. */
export function conditionBucket(condition?: string | null): 'new' | 'used' | 'digital' {
    if (condition && DIGITAL_SET.has(condition)) return 'digital';
    return condition === 'used' ? 'used' : 'new';
}

export function isDigital(condition?: string | null): boolean {
    return !!condition && DIGITAL_SET.has(condition);
}

/** Etiquetas de familias para filtros y gráficos agregados. */
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

/** Etiquetas del valor crudo de cada oferta. */
export const CONDITION_LABEL_BY_VALUE: Record<string, string> = {
    new: 'Nuevo',
    used: 'Usado',
    store: 'Store',
    key: 'Código',
    new_store: 'Nuevo + Store',
    new_key: 'Nuevo + Código',
    used_store: 'Usado + Store',
    used_key: 'Usado + Código',
    physical_store: 'Físico + Store',
    physical_key: 'Físico + Código',
    new_digital: 'Nuevo + Digital',
    used_digital: 'Usado + Digital',
};

export const CONDITION_BADGE_COLOR_BY_VALUE: Record<string, string> = {
    new: 'blue',
    used: 'yellow',
    store: 'grape',
    key: 'teal',
};

/** La etiqueta visible de una condición almacenada. */
export function conditionLabelFor(condition?: string | null): string {
    return CONDITION_LABEL_BY_VALUE[condition ?? ''] ?? CONDITION_LABEL[conditionBucket(condition)];
}

export function conditionBadgeColorFor(condition?: string | null): string {
    return CONDITION_BADGE_COLOR_BY_VALUE[condition ?? ''] ?? CONDITION_BADGE_COLOR[conditionBucket(condition)];
}
