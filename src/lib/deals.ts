/* ── Ofertas del día: textos y derivados puros ────────────────────────────
 * Vive aparte de las páginas para que la frase sea LA MISMA en el HTML, en la
 * meta description y en `llms.txt` (misma regla que `bestPriceSentence`): una
 * cifra citada por un motor generativo tiene que poder verificarse abriendo la
 * página que la respalda. Sin dependencias de React ni de Mantine: lo importan
 * Server Components, rutas de texto y los tests unitarios.
 */
import type { Deal, DealsResponse, Game, Platform } from './types';
import { platformLongName } from './types';
import { formatCLP } from './utils';
import { CONDITION_LABEL, conditionBucket } from './conditions';
import { absoluteUrl, formatDate, gamePath } from './seo';

/** Cómo se decide qué es una oferta. Corto y factual: es lo que permite leer
 *  el «−33%» como un dato y no como un reclamo publicitario. Las cifras tienen
 *  que moverse con las constantes de `games/deals.py` en el backend. */
export const DEALS_METHOD_LINE =
    'Una oferta aparece aquí cuando el precio más bajo de hoy está al menos 15% bajo su ' +
    'mediana de los últimos 90 días y ahorra $1.000 o más.';

/** Las ofertas se calculan sobre el catálogo entero y NO se recalculan con los
 *  filtros del visitante (haría falta otra API). Se dice en vez de esconderlo:
 *  quien tenga apagadas las importadoras puede ver una oferta de una. */
export const DEALS_SCOPE_NOTE = 'Calculadas sobre todas las tiendas y condiciones.';

/** El signo menos tipográfico: el guion corto se lee como un guion de unión. */
const MINUS = '−';

/** Se publica con un decimal (33.3) pero se muestra entero: un decimal en una
 *  rebaja aparenta una precisión que la mediana de 90 días no tiene. */
const pct = (deal: Deal) => Math.round(deal.discount_pct);

const count = (n: number) => n.toLocaleString('es-CL');

/** «Nuevo» / «Usado» / «Digital». Una oferta se compara contra el precio típico
 *  de SU condición (una copia digital contra la mediana del físico daba
 *  rebajas falsas del 85%), así que la condición es parte del dato: sin ella
 *  «−33%» no dice frente a qué. */
const conditionLabel = (deal: Deal) => CONDITION_LABEL[deal.condition] ?? CONDITION_LABEL.new;

/** La consola de la oferta, con su nombre, sacada del propio juego para no
 *  pedir `/platforms/` solo por un nombre. null si el juego no la declara. */
function dealPlatform(deal: Deal): Platform | null {
    return deal.game.platforms?.find((p) => p.slug === deal.platform) ?? null;
}

/* ── ¿Son las ofertas de HOY? ──────────────────────────────────────────────
 * La API sirve la última fecha calculada, no necesariamente hoy: si el cron de
 * la noche no corrió, `date` es de ayer (o de antes). Llamarlas «de hoy» sería
 * publicar precios viejos como frescos, así que todo texto que diga «hoy» pasa
 * por aquí y, si la fecha no es la de hoy en Chile, dice «del <fecha>».
 *
 * Todas reciben `now` (por defecto, el reloj) para poder probarse con una
 * fecha fija. Y se calculan en el SERVIDOR: la página o la portada pasan los
 * textos ya resueltos a los componentes de cliente. Un `new Date()` durante el
 * render del cliente podría caer en otro día que el del servidor (cerca de la
 * medianoche) y romper la hidratación.
 */

/** Hasta cuántos días de antigüedad la página se sigue indexando. Más viejas,
 *  `noindex`: un buscador no debe citar como vigentes rebajas de la semana pasada. */
export const DEALS_MAX_INDEX_AGE_DAYS = 2;

/** `now` como fecha local de Chile, `YYYY-MM-DD` (el formato de `res.date`):
 *  `en-CA` es el locale que formatea así. */
export function santiagoDate(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
}

/** ¿La tanda de la respuesta es la de hoy en Chile? Sin fecha (tabla vacía) no. */
export function isTodayDeals(res: Pick<DealsResponse, 'date'>, now: Date = new Date()): boolean {
    return res.date != null && res.date === santiagoDate(now);
}

/** «8 de octubre de 2026» a partir de `YYYY-MM-DD`. No `formatDate(res.date)`
 *  a secas: `new Date('2026-10-08')` es la medianoche UTC, que en Chile aún es
 *  el día 7. Al mediodía UTC el día es el mismo en los dos husos. */
function formatDealsDate(date: string): string | null {
    return formatDate(`${date}T12:00:00Z`);
}

/** La fecha legible de una tanda que NO es la de hoy, o null si es de hoy (o
 *  no hay fecha): null = «hoy» en los textos. */
function staleDateLabel(res: Pick<DealsResponse, 'date'>, now: Date): string | null {
    if (res.date == null || isTodayDeals(res, now)) return null;
    return formatDealsDate(res.date);
}

/** Días entre la tanda y hoy en Chile (0 = hoy), o null sin fecha. */
export function dealsAgeDays(res: Pick<DealsResponse, 'date'>, now: Date = new Date()): number | null {
    if (res.date == null) return null;
    const day = (iso: string) => {
        const [y, m, d] = iso.split('-').map(Number);
        return Date.UTC(y, m - 1, d);
    };
    return Math.round((day(santiagoDate(now)) - day(res.date)) / 86_400_000);
}

export function dealsHeading(
    platform?: Platform | null,
    res: Pick<DealsResponse, 'date'> = { date: null },
    now: Date = new Date(),
): string {
    const subject = platform ? `Ofertas de ${platformLongName(platform)}` : 'Ofertas de videojuegos en Chile';
    const stale = staleDateLabel(res, now);
    return stale ? `${subject} del ${stale}` : `${subject} hoy`;
}

/** El título de la sección de la portada y de la de `llms.txt`. */
export function dealsSectionTitle(res: Pick<DealsResponse, 'date'>, now: Date = new Date()): string {
    const stale = staleDateLabel(res, now);
    return stale ? `Ofertas del ${stale}` : 'Ofertas de hoy';
}

/** Lo que se dice cuando la API de ofertas falló: ni «no hay ofertas» (sería
 *  falso) ni las de otro día. */
export const DEALS_UNAVAILABLE = 'Las ofertas del día no están disponibles en este momento.';

/** Textos e indexación de /ofertas y /ofertas/<consola>, resueltos de una vez
 *  para la página y su metadata (que tienen que decir lo mismo). */
export interface DealsPageView {
    heading: string;
    summary: string;
    noIndex: boolean;
    /** La tanda es la de hoy: decide si una tarjeta puede decir «Nueva hoy». */
    isToday: boolean;
}

export function dealsPageView(
    res: DealsResponse,
    { platform, failed = false, now = new Date() }: { platform?: Platform | null; failed?: boolean; now?: Date } = {},
): DealsPageView {
    const heading = dealsHeading(platform, failed ? { date: null } : res, now);
    if (failed) {
        // Un fallo no es «no hay ofertas»: texto neutro, y `noindex` para que
        // un buscador no se quede con una página sin contenido.
        return { heading, summary: DEALS_UNAVAILABLE, noIndex: true, isToday: false };
    }
    const age = dealsAgeDays(res, now);
    return {
        heading,
        summary: dealsSummarySentence(res, platform, now),
        // Sin ofertas no hay nada que indexar (contenido pobre que además
        // cambia a diario), y con más de 2 días tampoco: serían rebajas viejas.
        noIndex: res.count === 0 || (age != null && age > DEALS_MAX_INDEX_AGE_DAYS),
        isToday: isTodayDeals(res, now),
    };
}

/**
 * «37 juegos están al menos 15% bajo su precio típico de los últimos 90 días.
 *  La mayor rebaja es X (PlayStation 5): $19.990 frente a $29.990 habitual
 *  (−33%) en Zmart. Precios con envío incluido; datos del scrapeo del 7 de
 *  octubre de 2026.»
 *
 * Degrada por cláusulas: sin tienda omite «en …», sin consola conocida omite el
 * paréntesis, sin scrapeo finalizado omite la fecha. Nunca dice «no disponible».
 * La fecha es la del SCRAPEO y no la del cálculo: el comando corre cada noche,
 * pero los precios solo son tan frescos como la última pasada del scraper.
 */
export function dealsSummarySentence(
    res: DealsResponse,
    platform?: Platform | null,
    now: Date = new Date(),
): string {
    const scraped = formatDate(res.last_scrape_at);
    const of = platform ? ` de ${platformLongName(platform)}` : '';
    // Una tanda de otro día se cuenta en pasado y con su fecha: «hoy» y el
    // presente la harían pasar por vigente.
    const stale = staleDateLabel(res, now);

    if (res.count === 0 || res.results.length === 0) {
        const date = scraped ? ` Datos del scrapeo del ${scraped}.` : '';
        return stale
            ? `El ${stale} no había juegos${of} 15% bajo su precio típico.${date}`
            : `Hoy no hay juegos${of} 15% bajo su precio típico.${date}`;
    }

    const [one, many] = stale ? ['estaba', 'estaban'] : ['está', 'están'];
    const subject = res.count === 1 ? `1 juego${of} ${one}` : `${count(res.count)} juegos${of} ${many}`;
    let text = `${stale ? `El ${stale}, ` : ''}${subject} al menos 15% bajo su precio típico de los últimos 90 días.`;

    // Los resultados llegan ordenados por descuento: el primero es la mayor rebaja.
    const top = res.results[0];
    // En la página de una consola el paréntesis repetiría lo que ya dice la cifra.
    const topPlatform = platform ? null : dealPlatform(top);
    const where = topPlatform ? ` (${platformLongName(topPlatform)})` : '';
    const condition = conditionLabel(top).toLowerCase();
    // La condición va tras la tienda («en Zmart (nuevo)»); sin tienda conocida
    // se pega al porcentaje para no dejar dos paréntesis seguidos.
    const tail = top.seller
        ? ` (${MINUS}${pct(top)}%) en ${top.seller.name} (${condition})`
        : ` (${MINUS}${pct(top)}%, ${condition})`;
    text +=
        ` La mayor rebaja ${stale ? 'era' : 'es'} ${top.game.name}${where}: ${formatCLP(top.current_price)} frente a ` +
        `${formatCLP(top.typical_price)} habitual${tail}.`;

    text += scraped
        ? ` Precios con envío incluido; datos del scrapeo del ${scraped}.`
        : ' Precios con envío incluido.';
    return text;
}

/** «Digital · −33% · típico $29.990»: la línea bajo cada tarjeta. */
export function dealBadgeLine(deal: Deal): string {
    return `${conditionLabel(deal)} · ${MINUS}${pct(deal)}% · típico ${formatCLP(deal.typical_price)}`;
}

/** «Nueva hoy» o «N días en oferta». Distingue lo que acaba de bajar de lo que
 *  lleva semanas así: lo segundo es casi el precio nuevo, no una rebaja.
 *
 *  `isToday` (de `isTodayDeals`, calculado en el servidor) es si la tanda es la
 *  de hoy. Si no lo es, «Nueva hoy» sería falso —era nueva el día del
 *  cálculo— y se devuelve null (sin etiqueta); los días en oferta se cuentan
 *  hasta ese día y siguen siendo ciertos. */
export function dealAgeLabel(deal: Deal, isToday = true): string | null {
    if (deal.is_new) return isToday ? 'Nueva hoy' : null;
    return deal.days_on_deal === 1 ? '1 día en oferta' : `${deal.days_on_deal} días en oferta`;
}

/** Condiciones que la tarjeta sabe pintar. El bucket `digital` no dice si es
 *  Store o código, y la tarjeta solo tiene icono para esos dos. */
const CARD_CONDITIONS = new Set(['new', 'used']);

const sameAmount = (a: string | null | undefined, b: string | null | undefined) =>
    a != null && b != null && Number(a) === Number(b);

/**
 * El juego que se le pasa a `GameCard` para que su precio sea el de la OFERTA.
 *
 * `deal.game.min_price` es el mínimo del catálogo completo, que puede venir de
 * otra consola u otra condición: la tarjeta mostraría $9.990 justo encima de
 * «−33% · típico $29.990» de una oferta de $19.990, y enlazaría la ficha en la
 * consola equivocada. Cuando el mínimo ES la oferta se devuelve el juego tal
 * cual, con su desglose de envío; si no, se sustituyen precio, consola y
 * condición, y el desglose y la tienda quedan en null porque no se conocen
 * para esta oferta — mezclarlos con los del otro mínimo daría un total que no
 * cuadra (y un cupón que quizá no aplica).
 *
 * «Es la oferta» exige además el mismo CUBO de condición: un usado y un nuevo
 * pueden costar lo mismo en la misma consola, y entonces la tarjeta pintaría
 * «Usado» y la tienda del usado sobre la línea «Nuevo · −33%». El mínimo
 * publica el valor crudo (`store`/`key`), por eso se colapsa antes de comparar.
 */
export function dealCardGame(deal: Deal): Game {
    const game = deal.game;
    if (
        game.min_price_platform === deal.platform &&
        conditionBucket(game.min_price_condition) === deal.condition &&
        sameAmount(game.min_price, deal.current_price)
    ) {
        return game;
    }
    return {
        ...game,
        min_price: deal.current_price,
        min_price_base: null,
        min_price_shipping: null,
        min_price_seller: null,
        min_price_platform: deal.platform,
        min_price_condition: CARD_CONDITIONS.has(deal.condition)
            ? (deal.condition as NonNullable<Game['min_price_condition']>)
            : null,
        // La marca 💸 de admin habla de la oferta más barata del catálogo, no de esta.
        min_price_is_affiliate: false,
    };
}

/**
 * Consolas de las ofertas LISTADAS: únicas, en el orden de negocio del
 * catálogo (`order`), no en el de los descuentos. Sale de los juegos de las
 * propias ofertas; un slug que el juego no declara no tiene nombre que mostrar
 * y se descarta. Solo cubre las tarjetas (≤ 60): los chips y el sitemap usan
 * `res.platforms` y caen aquí únicamente contra un backend anterior.
 */
export function dealConsoles(deals: Deal[]): Platform[] {
    const bySlug = new Map<string, Platform>();
    for (const deal of deals) {
        if (bySlug.has(deal.platform)) continue;
        const platform = dealPlatform(deal);
        if (platform) bySlug.set(platform.slug, platform);
    }
    return [...bySlug.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Un chip de consola: la consola y cuántos juegos tiene en oferta hoy, o
 *  `null` si el backend no lo dice (versión anterior a `platforms`). */
export interface DealConsole {
    platform: Platform;
    count: number | null;
}

/**
 * Los chips de /ofertas. Salen de `res.platforms`, que es la lista COMPLETA del
 * día: derivarlos de las 60 tarjetas dejaba sin chip a cualquier consola cuyas
 * rebajas no llegaran al top, aunque su página tuviera cientos de ofertas.
 * El orden es el que manda el backend (`Platform.order`).
 *
 * `platforms` solo trae slugs: el nombre sale del catálogo (`/platforms/`) y,
 * si no se pudo pedir, del juego de alguna tarjeta. Un slug sin nombre por
 * ninguna vía se omite, como en `dealConsoles`. Contra un backend anterior,
 * sin `platforms`, se cae a lo de antes (consolas de las tarjetas, sin conteo).
 */
export function dealConsoleChips(res: DealsResponse, catalog: readonly Platform[] = []): DealConsole[] {
    if (!res.platforms) {
        return dealConsoles(res.results).map((platform) => ({ platform, count: null }));
    }
    const named = new Map<string, Platform>();
    for (const deal of res.results) {
        const platform = dealPlatform(deal);
        if (platform) named.set(platform.slug, platform);
    }
    for (const platform of catalog) named.set(platform.slug, platform);
    return res.platforms.flatMap(({ slug, count: n }) => {
        const platform = named.get(slug);
        return platform ? [{ platform, count: n }] : [];
    });
}

/** «PlayStation 5 · 389»: un solo string, para que React no lo parta en nodos
 *  de texto y el chip se lea (y se busque en el HTML) tal cual. */
export function dealConsoleChipLabel({ platform, count: n }: DealConsole): string {
    return n == null ? platformLongName(platform) : `${platformLongName(platform)} · ${count(n)}`;
}

/** Slugs de las consolas con ofertas, para el sitemap (`/ofertas/<slug>`).
 *  No necesita nombres: de `platforms` tal cual, o de las tarjetas si el
 *  backend es anterior. */
export function dealConsoleSlugs(res: DealsResponse): string[] {
    return res.platforms
        ? res.platforms.map((p) => p.slug)
        : dealConsoles(res.results).map((p) => p.slug);
}

/** Un `]` en el nombre cerraría la etiqueta del enlace Markdown antes de
 *  tiempo (mismo escape que la sección del blog de `llms.txt`). */
const escapeMdLabel = (text: string) => text.replace(/[[\]]/g, '\\$&');

/** «- [Juego (PlayStation 5, nuevo)](…/juego/juego-7?platform=ps5): $19.990, −33%
 *  frente a su precio típico de $29.990». Enlaza la ficha en la consola de la
 *  oferta: es la que muestra primero el precio que se cita. */
export function dealLlmsLine(deal: Deal): string {
    const platform = dealPlatform(deal);
    const condition = conditionLabel(deal).toLowerCase();
    const label = platform
        ? `${deal.game.name} (${platformLongName(platform)}, ${condition})`
        : `${deal.game.name} (${condition})`;
    const url = absoluteUrl(gamePath(deal.game, deal.platform));
    return (
        `- [${escapeMdLabel(label)}](${url}): ${formatCLP(deal.current_price)}, ` +
        `${MINUS}${pct(deal)}% frente a su precio típico de ${formatCLP(deal.typical_price)}`
    );
}
