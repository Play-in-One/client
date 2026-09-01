import type { MinPricePoint } from '@/lib/types';

/** Punto listo para recharts: `t` es epoch en ms, para que el eje X pueda ser
 *  numérico-temporal y el espaciado horizontal refleje el tiempo real. */
export interface ChartPoint {
    t: number;
    /** null = sin stock; corta la línea en vez de interpolar sobre el hueco. */
    price: number | null;
    /** Punto NO medido, añadido para que la línea cubra la ventana:
     *  'edge' = precio vigente al empezar el rango, 'now' = vigente hasta hoy.
     *  No se le dibuja marca — un punto sugiere una muestra que no existió. */
    kind?: 'edge' | 'now';
}

export interface PriceSeries {
    points: ChartPoint[];
    domain: [number, number];
    /** Puntos dibujables, sintéticos incluidos: decide si hay línea. */
    plotCount: number;
    /** Muestras REALES dentro de la ventana. Cero con plotCount 2 significa
     *  "el precio no se movió en este rango", que no es lo mismo que "no hay
     *  datos" y merece otro texto. */
    realCount: number;
    /** Hay muestras más antiguas que el rango elegido. */
    hasOlderData: boolean;
}

const DAY_MS = 86_400_000;

/** Resta días por calendario, no restando milisegundos.
 *
 *  Chile cambia la hora en septiembre y abril: `t - 30*DAY_MS` cruzando el
 *  cambio cae a las 23:00 del día anterior y el eje muestra un día de menos.
 */
function subtractDays(from: number, days: number): number {
    const d = new Date(from);
    d.setDate(d.getDate() - days);
    return d.getTime();
}

/** Arma la serie del gráfico para una ventana de `rangeDays` hacia atrás desde `now`.
 *
 * La serie del backend sólo registra un punto cuando el mínimo CAMBIA, así que
 * tal cual viene deja dos huecos que hay que rellenar para que la ventana se
 * lea bien: el tramo entre el inicio del rango y la primera muestra dentro de
 * él, y el tramo entre la última muestra y hoy.
 */
export function buildPriceSeries(
    prices: MinPricePoint[],
    rangeDays: number,
    now: number,
): PriceSeries {
    const from = subtractDays(now, rangeDays);

    // El backend entrega más reciente primero, pero recharts NO ordena: con un
    // eje numérico un punto fuera de sitio dibuja un zigzag hacia atrás. Se
    // ordena aquí en vez de confiar en el orden de la API.
    const parsed: ChartPoint[] = prices
        .map((p) => ({
            t: Date.parse(p.timestamp),
            price: p.price === null ? null : parseFloat(p.price),
        }))
        .filter((p) => Number.isFinite(p.t))
        .map((p) => ({ ...p, price: Number.isFinite(p.price as number) ? p.price : null }))
        .sort((a, b) => a.t - b.t);

    const inRange = parsed.filter((p) => p.t >= from && p.t <= now);
    const older = parsed.filter((p) => p.t < from);

    const points: ChartPoint[] = [];

    // Borde izquierdo: la última muestra ANTERIOR a la ventana define el precio
    // vigente cuando la ventana empieza. Filtrarla y ya está sería mentir — el
    // backend sólo escribe cuando el mínimo se mueve, así que "sin puntos"
    // significa "sin cambios", no "sin precio". Se arrastra el último valor
    // conocido, incluido un null (sin stock), que deja el hueco donde debe.
    const carry = older[older.length - 1];
    if (carry && (inRange.length === 0 || inRange[0].t > from)) {
        points.push({ t: from, price: carry.price, kind: 'edge' });
    }
    points.push(...inRange);

    // Borde derecho: la última muestra puede ser de hace semanas y la línea
    // quedaría cortada a media caja. Se prolonga hasta ahora con el mismo
    // precio — salvo que la última sea "sin stock": ese hueco ES la información.
    const last = points[points.length - 1];
    if (last && last.price !== null && last.t < now) {
        points.push({ t: now, price: last.price, kind: 'now' });
    }

    // El dominio arranca siempre en `from`, aunque el historial sea más corto:
    // así 30d y 180d son comparables y el espacio vacío a la izquierda dice
    // "aquí empieza lo que sabemos". Un dominio degenerado divide por cero.
    const domain: [number, number] = from === now ? [from - DAY_MS, now] : [from, now];

    return {
        points,
        domain,
        plotCount: points.filter((p) => p.price !== null).length,
        realCount: inRange.filter((p) => p.price !== null).length,
        hasOlderData: older.length > 0,
    };
}

// Escalones en días y luego en meses: sumar "30 días" nunca cae en el mismo día
// del mes y las etiquetas quedan sucias en los rangos largos.
const DAY_STEPS = [1, 2, 3, 7, 15];
const MONTH_STEPS = [1, 2, 3, 6];

/** Marcas en fechas redondas dentro del dominio.
 *
 * Con un eje numérico recharts elige "números redondos", no fechas redondas:
 * en 90 días salen etiquetas desplazadas a horas arbitrarias, y a veces la
 * misma fecha formateada dos veces. Se camina hacia atrás desde hoy porque en
 * un historial de precios "hace una semana" se lee mejor que una fecha redonda.
 */
export function buildTimeTicks([from, to]: [number, number], target = 6): number[] {
    if (!(to > from)) return [];
    // Redondeado: con el cambio de hora una ventana de 180 días mide 180.04, y
    // sin redondear el umbral `spanDays / 30 <= 6` se pasa por centésimas y el
    // eje cae a marcas bimestrales.
    const spanDays = Math.round((to - from) / DAY_MS);
    const ticks: number[] = [];

    const cursor = new Date(to);
    cursor.setHours(0, 0, 0, 0);

    const dayStep = DAY_STEPS.find((s) => spanDays / s <= target);
    if (dayStep) {
        while (cursor.getTime() >= from) {
            ticks.push(cursor.getTime());
            cursor.setDate(cursor.getDate() - dayStep);
        }
    } else {
        const monthStep = MONTH_STEPS.find((s) => spanDays / (s * 30) <= target) ?? 6;
        cursor.setDate(1);
        while (cursor.getTime() >= from) {
            ticks.push(cursor.getTime());
            cursor.setMonth(cursor.getMonth() - monthStep);
        }
    }

    ticks.reverse(); // recharts espera los ticks ascendentes
    // Un rango degenerado deja la lista vacía y recharts vuelve a sus ticks
    // automáticos (epochs crudos); mejor dar al menos los extremos.
    return ticks.length ? ticks : [from, to];
}

/** Etiqueta del eje según el ancho de la ventana: con 180 días el día del mes
 *  es ruido y las etiquetas se pisan; con 30 es justo lo que se quiere leer. */
export function timeTickFormatter([from, to]: [number, number]): (value: number) => string {
    const spanDays = (to - from) / DAY_MS;
    // Una instancia de Intl para todo el eje, no una por tick.
    const fmt = new Intl.DateTimeFormat('es-CL',
        spanDays > 120
            ? { month: 'short' }
            : { day: '2-digit', month: '2-digit' },
    );
    return (value: number) => fmt.format(value);
}
