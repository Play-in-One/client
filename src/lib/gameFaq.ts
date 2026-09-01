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
import type { FaqEntry } from './seo';
import { bestPriceSentence } from './seo';
import { formatCLP } from './utils';
import type { Game, MinPricePoint, Product } from './types';

const CONDITION_LABELS: Record<Product['condition'], string> = {
    new: 'nuevo',
    used: 'usado',
    digital: 'digital',
};

const price = (value: string | null | undefined): number | null => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** La oferta más barata por condición, en precio efectivo. */
function cheapestByCondition(products: Product[]): Map<Product['condition'], Product> {
    const best = new Map<Product['condition'], Product>();
    for (const product of products) {
        const value = price(product.current_price);
        if (value == null) continue;
        const current = best.get(product.condition);
        if (!current || value < (price(current.current_price) ?? Infinity)) {
            best.set(product.condition, product);
        }
    }
    return best;
}

/** Mínimo histórico de la serie agregada, entre todas las consolas. */
function historicLow(game: Game): number | null {
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
    return low;
}

export function buildGameFaq(game: Game): FaqEntry[] {
    const entries: FaqEntry[] = [];
    const products = (game.products ?? []).filter((p) => p.current_price != null);

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
                `${game.name} está disponible en ${listed}${rest}. ` +
                'Los precios incluyen el envío promedio de cada tienda, así que ' +
                'se pueden comparar directamente entre sí.',
        });
    }

    const byCondition = cheapestByCondition(products);
    if (byCondition.size > 0) {
        const parts = (['new', 'used', 'digital'] as const)
            .filter((condition) => byCondition.has(condition))
            .map((condition) => {
                const product = byCondition.get(condition)!;
                return `${CONDITION_LABELS[condition]} desde ${formatCLP(product.current_price!)} en ${product.seller.name}`;
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
        const answer =
            current <= low
                ? `Sí. ${formatCLP(current)} es el precio más bajo que ha tenido ${game.name} ` +
                  'desde que PIO lo sigue.'
                : `El precio más bajo registrado para ${game.name} es ${formatCLP(low)}. ` +
                  `Hoy está en ${formatCLP(current)}, ${formatCLP(current - low)} por sobre ese mínimo.`;
        entries.push({
            question: `¿${game.name} está en su precio más bajo?`,
            answer,
        });
    }

    if (game.platforms?.length) {
        const names = game.platforms.map((p) => p.display_name);
        const list =
            names.length === 1
                ? names[0]
                : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
        entries.push({
            question: `¿Para qué consolas está disponible ${game.name}?`,
            // "con ofertas en stock" no es un matiz: Game.platforms es derivado
            // de los productos visibles, así que una consola desaparece de la
            // lista cuando se agota su última oferta.
            answer: `${game.name} tiene ofertas en stock para ${list}.`,
        });
    }

    return entries;
}
