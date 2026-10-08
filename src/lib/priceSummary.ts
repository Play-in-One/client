/* ── Resumen de precios determinista ───────────────────────────────────────
 * Frases construidas SOLO con `price_stats` y el precio vigente: nada de texto
 * generado ni redondeos creativos. Es lo que la ficha muestra, lo que repite la
 * FAQ (`gameFaq.ts`) y lo que cita un buscador, así que las tres tienen que
 * salir de las mismas funciones: dos redacciones del mismo dato acaban
 * contradiciéndose.
 *
 * Puro y sin React: se importa desde Server Components.
 */
import { CONDITION_LABEL } from './conditions';
import { normalizeRatings, averageNormalized } from './ratings';
import { bestPriceSentence, formatDate } from './seo';
import { platformLongName } from './types';
import type { Game, GameRating, Platform, PriceStatPoint, PriceStats } from './types';
import { formatCLP } from './utils';

const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

const num = (value: string | number | null | undefined): number | null => {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** Nombre largo de una consola por slug, resuelto con las consolas del propio
 *  juego y `platformLongName`. No se usa el catálogo `platforms.ts`: arrastra
 *  los iconos de todas las consolas a los Server Components. Si el juego no la
 *  lista, el slug mismo (mejor un dato crudo que ocultar la frase). */
const platformName = (slug: string, platforms: Platform[] = []): string => {
    const platform = platforms.find((p) => p.slug === slug);
    return platform ? platformLongName(platform) : slug;
};

/** Fecha larga es-CL de un `YYYY-MM-DD` del backend.
 *
 *  `formatDate` formatea en America/Santiago, y `new Date('2026-07-14')` es la
 *  medianoche UTC: en Chile ya es el 13. Se ancla al mediodía UTC para que el
 *  día calendario sobreviva a la conversión de zona. */
export function formatStatDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    return formatDate(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
}

/* ── Cláusulas (se reutilizan tal cual en la FAQ) ─────────────────────── */

export function historicMinSentence(
    min: PriceStatPoint | null | undefined,
    platforms: Platform[] = [],
): string | null {
    if (!min) return null;
    const date = formatStatDate(min.date);
    const when = date ? `, registrado el ${date}` : '';
    const where = min.seller ? ` en ${min.seller.name}` : '';
    return `Su mínimo histórico es ${formatCLP(min.price)}${when}${where} (${platformName(min.platform, platforms)}).`;
}

/** Distancia al mínimo. `null` si ya está en él o la diferencia no llega al 1%. */
function aboveMinSentence(stats: PriceStats, current: number | null): string | null {
    if (stats.is_all_time_low) return 'Hoy está en su mínimo histórico.';
    const min = num(stats.all_time_min?.price);
    if (current == null || min == null || min <= 0) return null;
    const pct = Math.round(((current - min) / min) * 100);
    if (pct === 0) return null;
    return `Hoy está un ${pct}% sobre ese mínimo (${formatCLP(current - min)} más).`;
}

/** Variación del mínimo respecto a hace 30 días.
 *
 *  Recibe `PriceStats` entero, no solo `change_30d`: `abs` es mínimo actual
 *  menos mínimo de hace 30 días, así que un 0 solo dice que el piso VOLVIÓ a
 *  donde estaba (p. ej. una oferta que ya terminó). Afirmar que "no ha
 *  cambiado" exige además que el último cambio registrado tenga 30 días o más. */
export function change30Sentence(stats: PriceStats | null | undefined): string | null {
    const change = stats?.change_30d;
    if (!change) return null;
    const abs = num(change.abs);
    if (abs == null) return null;
    if (abs === 0) {
        const days = stats!.days_since_last_change;
        return days != null && days >= 30
            ? 'El precio más bajo no ha cambiado en los últimos 30 días.'
            : 'Está al mismo precio que hace 30 días.';
    }
    const pct = decimal.format(Math.abs(change.pct));
    return abs < 0
        ? `Bajó ${formatCLP(Math.abs(abs))} (${pct}%) respecto a hace 30 días.`
        : `Subió ${formatCLP(abs)} (${pct}%) respecto a hace 30 días.`;
}

export function averageSentence(
    avg: string | null | undefined,
    current: string | number | null | undefined,
): string | null {
    const average = num(avg);
    const now = num(current);
    if (average == null || now == null) return null;
    // Se compara lo que se imprime: 50.000,4 vs 50.000 no puede decir "por encima".
    const [a, n] = [Math.round(average), Math.round(now)];
    const rel = n < a ? 'por debajo del' : n > a ? 'por encima del' : 'en el';
    return `El promedio de los últimos 180 días es ${formatCLP(average)}; hoy está ${rel} promedio.`;
}

export function conditionRangeSentence(byCondition: PriceStats['by_condition'] | undefined): string | null {
    if (!byCondition) return null;
    const parts = (['new', 'used', 'digital'] as const).flatMap((key) => {
        const range = byCondition[key];
        if (!range) return [];
        const label = CONDITION_LABEL[key].toLowerCase();
        return [
            range.min === range.max || num(range.min) === num(range.max)
                ? `${label} ${formatCLP(range.min)}`
                : `${label} de ${formatCLP(range.min)} a ${formatCLP(range.max)}`,
        ];
    });
    return parts.length ? `Precios en stock por condición: ${parts.join('; ')}.` : null;
}

/** La frase de precio y, debajo, las cifras que respalda `price_stats`.
 *  La primera es SIEMPRE `bestPriceSentence`: HTML, meta description y FAQ
 *  comparten esa apertura. */
export function priceSummarySentences(game: Game): string[] {
    const out: string[] = [];
    const best = bestPriceSentence(game);
    if (best) out.push(best);

    const stats = game.price_stats;
    if (!stats) return out;

    const current = num(game.min_price);
    const rest = [
        historicMinSentence(stats.all_time_min, game.platforms),
        aboveMinSentence(stats, current),
        change30Sentence(stats),
        averageSentence(stats.avg_180d, game.min_price),
        conditionRangeSentence(stats.by_condition),
    ];
    for (const sentence of rest) if (sentence) out.push(sentence);
    return out;
}

/* ── Mínimos mensuales ─────────────────────────────────────────────────── */

const MONTH_FORMAT = new Intl.DateTimeFormat('es-CL', {
    month: 'long', year: 'numeric', timeZone: 'America/Santiago',
});
const MONTH_KEY_FORMAT = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', timeZone: 'America/Santiago',
});

/** Índice absoluto de mes (año*12+mes) en hora de Chile: el mes de un precio es
 *  el que vio un comprador, no el UTC (un 1 de mes a las 00:30 en Chile es el
 *  31 del anterior en UTC). */
function monthIndex(ms: number): number {
    const parts = MONTH_KEY_FORMAT.formatToParts(new Date(ms));
    const year = Number(parts.find((p) => p.type === 'year')!.value);
    const month = Number(parts.find((p) => p.type === 'month')!.value);
    return year * 12 + (month - 1);
}

function monthLabel(index: number): string {
    // Mediodía del día 15 UTC: lejos de cualquier borde de mes en cualquier zona.
    return MONTH_FORMAT.format(new Date(Date.UTC(Math.floor(index / 12), index % 12, 15, 12)));
}

/** Mínimo de cada mes calendario entre las consolas, del más reciente al más
 *  antiguo.
 *
 *  Parte de la serie agregada (`''`) de cada consola. Esa serie solo guarda
 *  CAMBIOS (ver `priceSeries.buildPriceSeries`), así que un mes sin puntos no es
 *  un mes sin precio: arrastra el último valor conocido, `null` ("sin stock")
 *  incluido. Mismo criterio de arrastre que `buildPriceSeries`, replicado aquí
 *  porque aquel trabaja sobre una ventana y un eje de tiempo, no sobre meses.
 *  El rango va del primer mes con datos al mes de `now` (inyectable en
 *  tests): como `buildPriceSeries`, que añade un punto en "ahora", un precio
 *  estable desde un único cambio sigue figurando mes a mes.
 */
export function monthlyMinimums(
    history: Game['min_price_history'],
    months = 6,
    now: number | Date = Date.now(),
): { month: string; price: number; platform: string }[] {
    if (!history) return [];

    // Por consola: puntos ordenados por tiempo, con su índice de mes.
    const series = Object.entries(history).flatMap(([platform, byCondition]) => {
        const points = (byCondition?.[''] ?? [])
            .map((p) => ({ t: Date.parse(p.timestamp), price: num(p.price) }))
            .filter((p) => Number.isFinite(p.t))
            .sort((a, b) => a.t - b.t)
            .map((p) => ({ ...p, month: monthIndex(p.t) }));
        return points.length ? [{ platform, points }] : [];
    });
    if (series.length === 0) return [];

    const all = series.flatMap((s) => s.points.map((p) => p.month));
    const first = Math.min(...all);
    // Cada consola arrastra su último precio hasta el mes de `now`.
    const last = Math.max(...all, monthIndex(+now));

    const result: { month: string; price: number; platform: string }[] = [];
    for (let m = first; m <= last; m++) {
        let best: { price: number; platform: string } | null = null;
        for (const { platform, points } of series) {
            // Vigente al empezar el mes (último punto de meses anteriores)...
            let candidate: number | null = null;
            for (const p of points) if (p.month < m) candidate = p.price;
            let min = candidate;
            // ...y cualquier cambio dentro del mes: el mínimo mensual los incluye.
            for (const p of points) {
                if (p.month === m && p.price != null && (min == null || p.price < min)) min = p.price;
            }
            if (min != null && (best == null || min < best.price)) best = { price: min, platform };
        }
        if (best) result.push({ month: monthLabel(m), ...best });
    }
    // Un solo mes no dibuja ninguna comparación.
    if (result.length < 2) return [];
    return result.reverse().slice(0, months);
}

/* ── Valoraciones ──────────────────────────────────────────────────────── */

/** Una línea por fuente y, con dos o más, el promedio normalizado. Usa
 *  `lib/ratings` —el mismo que el gráfico— para que el texto no discrepe. */
export function ratingLines(ratings: GameRating[] | undefined): string[] {
    if (!ratings?.length) return [];
    const normalized = normalizeRatings(ratings);
    const lines = normalized.map((r) => {
        const votes = r.count != null && r.count > 0 ? ` según ${r.count.toLocaleString('es-CL')} votos` : '';
        return `Valoración ${r.sourceLabel}: ${decimal.format(Number(r.score))}/${decimal.format(Number(r.scale))}${votes}`;
    });
    const average = averageNormalized(normalized);
    if (average != null) lines.push(`Promedio normalizado: ${decimal.format(average)}/10`);
    return lines;
}
