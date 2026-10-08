/* ── FAQ de un juego, derivada de sus datos reales ─────────────────────────
 * Una sola fuente para el bloque visible y para el FAQPage de schema.org: si
 * divergieran, el dato estructurado estaría afirmando algo que la página no
 * respalda, que es exactamente lo que penalizan tanto Google como los motores
 * generativos.
 *
 * Cada pregunta se OMITE cuando no hay dato para responderla. Nunca se
 * responde "no disponible": una respuesta vacía en un FAQPage es peor que la
 * ausencia de la pregunta.
 */
import { platformLongName } from '@/lib/types';
import type { FaqEntry } from './seo';
import { bestPriceSentence } from './seo';
import { formatCLP } from './utils';
import type { Game, MinPricePoint, Product } from './types';
import { CONDITION_LABEL, conditionBucket } from './conditions';
import { averageSentence, change30Sentence, formatStatDate } from './priceSummary';

type ConditionBucket = ReturnType<typeof conditionBucket>;

/* En minúscula porque van DENTRO de una frase ("se consigue nuevo desde …"),
 * no como rótulo suelto. Indexadas por BUCKET, así que una oferta `store`
 * cuenta como digital. */
const conditionWord = (bucket: ConditionBucket): string => CONDITION_LABEL[bucket].toLowerCase();

const MAX_ENTRIES = 6;

const price = (value: string | null | undefined): number | null => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** La oferta más barata por condición, en precio efectivo.
 *
 * Agrupa por BUCKET y no por el valor crudo: la frase de abajo recorre las tres
 * claves fijas, así que una oferta guardada como `store` caía en una clave que
 * nadie miraba y desaparecía del FAQ — un juego solo-digital publicaba una
 * respuesta sin una sola oferta, en el bloque visible y en el `FAQPage`. */
function cheapestByCondition(products: Product[]): Map<ConditionBucket, Product> {
    const best = new Map<ConditionBucket, Product>();
    for (const product of products) {
        const value = price(product.current_price);
        if (value == null) continue;
        const bucket = conditionBucket(product.condition);
        const current = best.get(bucket);
        if (!current || value < (price(current.current_price) ?? Infinity)) {
            best.set(bucket, product);
        }
    }
    return best;
}

interface HistoricLow {
    price: number;
    /** Solo lo trae `price_stats`; la serie no guarda ni fecha ni tienda. */
    date: string | null;
    seller: string | null;
}

/** Mínimo histórico: el de `price_stats` (con fecha y tienda) y, si el backend
 *  no lo manda, el escaneo de la serie agregada entre todas las consolas. */
function historicLow(game: Game): HistoricLow | null {
    const fromStats = game.price_stats?.all_time_min;
    const statsPrice = price(fromStats?.price);
    if (fromStats && statsPrice != null) {
        return { price: statsPrice, date: formatStatDate(fromStats.date), seller: fromStats.seller?.name ?? null };
    }

    const series = game.min_price_history;
    if (!series) return null;
    let low: number | null = null;
    for (const byCondition of Object.values(series)) {
        // La condición "" es la serie agregada (el mínimo entre nuevo, usado y
        // digital): usar las otras contaría dos veces el mismo punto.
        const points: MinPricePoint[] = byCondition[''] ?? [];
        for (const point of points) {
            const value = price(point.price);
            if (value != null && (low == null || value < low)) low = value;
        }
    }
    return low == null ? null : { price: low, date: null, seller: null };
}

export function buildGameFaq(game: Game): FaqEntry[] {
    const entries: FaqEntry[] = [];
    // Sin stock (delisted) no es una oferta real: publicarla aqui afirmaria
    // que el juego "esta disponible" en una tienda con un precio caducado.
    const products = (game.products ?? []).filter((p) => p.current_price != null && p.in_stock);

    const best = bestPriceSentence(game);
    if (best) {
        entries.push({
            question: `¿Cuál es el precio más barato de ${game.name}?`,
            answer: best,
        });
    }

    if (products.length > 0) {
        const sorted = [...products].sort(
            (a, b) => (price(a.current_price) ?? Infinity) - (price(b.current_price) ?? Infinity),
        );
        const listed = sorted
            .slice(0, 5)
            .map((p) => `${p.seller.name} (${formatCLP(p.current_price!)})`)
            .join(', ');
        const rest = sorted.length > 5 ? ` y ${sorted.length - 5} tiendas más` : '';
        entries.push({
            question: `¿Dónde comprar ${game.name} barato en Chile?`,
            answer:
                `${game.name} está disponible en ${listed}${rest}.`
        });
    }

    const byCondition = cheapestByCondition(products);
    if (byCondition.size > 0) {
        const parts = (['new', 'used', 'digital'] as const)
            .filter((condition) => byCondition.has(condition))
            .map((condition) => {
                const product = byCondition.get(condition)!;
                return `${conditionWord(condition)} desde ${formatCLP(product.current_price!)} en ${product.seller.name}`;
            });
        entries.push({
            question: `¿Cuánto cuesta ${game.name} nuevo o usado?`,
            answer: `${game.name} se consigue ${parts.join('; ')}.`,
        });
    }

    const low = historicLow(game);
    const current = price(game.min_price);
    if (low != null && current != null) {
        // El histórico solo registra CAMBIOS de precio, así que "igual al
        // mínimo histórico" es una afirmación fuerte y verificable.
        let answer: string;
        if (current <= low.price) {
            answer =
                `Sí. ${formatCLP(current)} es el precio más bajo que ha tenido ${game.name} ` +
                'desde que PIO lo sigue.';
        } else {
            const when = low.date ? `, el ${low.date}` : '';
            const where = low.seller ? ` en ${low.seller}` : '';
            // Como `aboveMinSentence`: un "(0%)" junto a una diferencia en pesos
            // se lee como contradicción, así que se omite si redondea a 0.
            const pctValue = low.price > 0 ? Math.round(((current - low.price) / low.price) * 100) : 0;
            const pct = pctValue !== 0 ? ` (${pctValue}%)` : '';
            answer =
                `El precio más bajo registrado para ${game.name} es ${formatCLP(low.price)}${when}${where}. ` +
                `Hoy está en ${formatCLP(current)}, ${formatCLP(current - low.price)}${pct} por sobre ese mínimo.`;
        }
        entries.push({
            question: `¿${game.name} está en su precio más bajo?`,
            answer,
        });
    }

    // Mismas frases que el resumen visible (`priceSummary`): FAQ y página no
    // pueden redactar distinto el mismo dato.
    const change = change30Sentence(game.price_stats);
    if (change) {
        entries.push({
            question: `¿Cómo ha cambiado el precio de ${game.name} en el último mes?`,
            answer: change,
        });
    }
    const average = averageSentence(game.price_stats?.avg_180d, game.min_price);
    if (average) {
        entries.push({
            question: `¿Cuánto cuesta ${game.name} en promedio?`,
            answer: average,
        });
    }

    // Se deriva de las ofertas VIGENTES (`products`, ya filtrado arriba a
    // `in_stock`), no de `game.platforms`: esa M2M ahora incluye tambien
    // consolas cuya unica oferta esta delisteada (ver
    // recompute_game_platforms), y afirmar "en stock" ahi seria falso.
    const inStockPlatforms = [...new Map(
        products.map((p) => [p.platform.slug, p.platform]),
    ).values()];
    if (inStockPlatforms.length) {
        const names = inStockPlatforms.map(platformLongName);
        const list =
            names.length === 1
                ? names[0]
                : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
        entries.push({
            question: `¿Para qué consolas está disponible ${game.name}?`,
            answer: `${game.name} tiene ofertas en stock para ${list}.`,
        });
    }

    // Tope de 6: las preguntas nuevas van antes de la de consolas, que es la
    // que cede cuando hay de todo.
    return entries.slice(0, MAX_ENTRIES);
}
