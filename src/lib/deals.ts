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

export function dealsHeading(platform?: Platform | null): string {
    return platform
        ? `Ofertas de ${platformLongName(platform)} hoy`
        : 'Ofertas de videojuegos en Chile hoy';
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
export function dealsSummarySentence(res: DealsResponse, platform?: Platform | null): string {
    const scraped = formatDate(res.last_scrape_at);
    const of = platform ? ` de ${platformLongName(platform)}` : '';

    if (res.count === 0 || res.results.length === 0) {
        const date = scraped ? ` Datos del scrapeo del ${scraped}.` : '';
        return `Hoy no hay juegos${of} 15% bajo su precio típico.${date}`;
    }

    const subject = res.count === 1 ? `1 juego${of} está` : `${count(res.count)} juegos${of} están`;
    let text = `${subject} al menos 15% bajo su precio típico de los últimos 90 días.`;

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
        ` La mayor rebaja es ${top.game.name}${where}: ${formatCLP(top.current_price)} frente a ` +
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
 *  lleva semanas así: lo segundo es casi el precio nuevo, no una rebaja. */
export function dealAgeLabel(deal: Deal): string {
    if (deal.is_new) return 'Nueva hoy';
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
