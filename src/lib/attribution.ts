/* Origen de la llegada: de dónde vino esta pestaña.

   El backend no puede verlo por su cuenta. El beacon a /api/events/ lleva como
   Referer la propia página de PIO, y su URL no trae los `utm_*` de la página de
   aterrizaje. Así que se anota aquí, una vez por carga, y `trackEvent` lo repite
   en cada evento. El canal (Instagram, Google Ads, directo…) lo decide el
   servidor en `analytics/attribution.py`: aquí solo se recoge.

   Qué NO sale del navegador:
   - La URL completa del referrer, solo su host. La de un buscador lleva lo que
     la persona tecleó.
   - El valor de `gclid`/`fbclid`/`ttclid`, solo QUÉ tipo de ID era. El valor es
     un identificador por clic que permitiría cruzarla con la cuenta
     publicitaria, y para saber que vino de un anuncio basta con el tipo.

   Se guarda en sessionStorage y no en una variable porque la atribución tiene
   que sobrevivir a una recarga, y a una pestaña abierta desde dentro del sitio.
   En ambos casos el referrer ya es PIO y la URL ya no trae UTM. Nunca pasa a
   localStorage: una llegada de hoy no debe teñir la visita de mañana. */

const STORAGE_KEY = 'pio_attr';
const MAX_LENGTH = 100;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;
/* En orden de prioridad: si una URL trae varios, gana el primero. Espejo de
   `CLICK_TYPES` en el backend, que descarta cualquier otro valor. */
const CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid', 'ttclid', 'fbclid', 'msclkid'] as const;

type ClickType = (typeof CLICK_PARAMS)[number];

export interface Attribution {
    ref?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    click?: ClickType;
}

let cached: Attribution | null = null;

function bareHost(host: string): string {
    return host.toLowerCase().replace(/^www\./, '');
}

function readLanding(): Attribution {
    const landing: Attribution = {};
    try {
        const host = document.referrer ? new URL(document.referrer).hostname : '';
        if (host && bareHost(host) !== bareHost(window.location.hostname)) {
            landing.ref = bareHost(host);
        }
    } catch { /* referrer ilegible: se trata como sin referrer */ }

    const params = new URLSearchParams(window.location.search);
    for (const key of UTM_KEYS) {
        const value = params.get(key)?.trim();
        if (value) landing[key] = value.slice(0, MAX_LENGTH);
    }
    const click = CLICK_PARAMS.find((param) => params.has(param));
    if (click) landing.click = click;
    return landing;
}

/**
 * La atribución de esta pestaña. Se calcula en la primera llamada de cada carga
 * de página, y la navegación interna del SPA no la cambia.
 *
 * Una llegada nueva con referrer externo, UTM o click ID reemplaza a la
 * guardada. Sin nada de eso, se recupera la guardada: es una recarga o una
 * pestaña abierta desde el propio sitio.
 */
export function getAttribution(): Attribution {
    if (cached) return cached;
    if (typeof window === 'undefined') return {};

    const landing = readLanding();
    if (Object.keys(landing).length > 0) {
        cached = landing;
        try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(landing));
        } catch { /* storage bloqueado: vale para esta carga */ }
        return cached;
    }

    let stored: Attribution = {};
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw) as Attribution;
    } catch { /* storage bloqueado o JSON corrupto: sin atribución */ }
    cached = stored && typeof stored === 'object' ? stored : {};
    return cached;
}

/** Añade la atribución a un FormData de evento, con los nombres que espera el backend. */
export function appendAttribution(fd: FormData): void {
    const attr = getAttribution();
    if (attr.ref) fd.append('attr_ref', attr.ref);
    if (attr.utm_source) fd.append('attr_utm_source', attr.utm_source);
    if (attr.utm_medium) fd.append('attr_utm_medium', attr.utm_medium);
    if (attr.utm_campaign) fd.append('attr_utm_campaign', attr.utm_campaign);
    if (attr.click) fd.append('attr_click', attr.click);
}
