/* Publicidad de terceros (Google AdSense).
 *
 * Un único bloque, al pie de la ficha de juego. No hay Auto ads: dejarían que
 * Google metiera anuncios donde quisiera, incluida la tabla de precios, que es
 * el producto.
 *
 * Las dos variables son `NEXT_PUBLIC_*`, o sea que **se hornean en el build**
 * (ver el Dockerfile del cliente). Cambiarlas exige reconstruir la imagen del
 * frontend, no basta con reiniciar el contenedor.
 */

/** ID de editor, `ca-pub-…`. Vacío = no se pide ni un anuncio. */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '';

/** Bloque del pie de la ficha de juego. Lo emite AdSense al crear la unidad. */
export const AD_SLOT_GAME_FOOTER = process.env.NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER ?? '';

/* Espacio Económico Europeo + Reino Unido.
 *
 * Google exige un CMP certificado del TCF para servir anuncios a esta gente, y
 * montarlo significaría un segundo banner de consentimiento conviviendo con el
 * propio. Para un comparador de precios chileno ese tráfico es marginal, así
 * que sale más barato no anunciarles que cumplir el requisito. */
const EEA_UK = new Set([
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
    'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
    'SE', 'SI', 'SK',
    'IS', 'LI', 'NO',
    'GB',
]);

/**
 * ¿Se le pueden servir anuncios a esta petición?
 *
 * El país lo pone Cloudflare en `CF-IPCountry`. **Solo llega si "IP
 * Geolocation" está activo en el panel de Cloudflare**; si no, esta función
 * responde `true` a todo el mundo y el geo-bloqueo no existe, sin ningún
 * error que lo delate.
 *
 * Sin cabecera se permite a propósito: en local y en dev no hay Cloudflare
 * delante, y bloquear ahí dejaría el hueco imposible de probar.
 */
export function adsAllowedForCountry(country: string | null | undefined): boolean {
    if (!country) return true;
    return !EEA_UK.has(country.trim().toUpperCase());
}
