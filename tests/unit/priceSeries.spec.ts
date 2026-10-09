import { test, expect } from '@playwright/test';
import { buildPriceSeries } from '../../src/lib/priceSeries';
import type { MinPricePoint } from '../../src/lib/types';

const NOW = Date.parse('2026-10-09T15:00:00Z');
const pt = (timestamp: string, price: string | null): MinPricePoint => ({ timestamp, price });

// El backend entrega la serie más reciente primero.
const ALAN_WAKE: MinPricePoint[] = [
    pt('2026-09-17T03:00:00+00:00', '39138.00'),
    pt('2026-08-26T04:00:00+00:00', null),
    pt('2026-06-30T04:00:00+00:00', '400099.00'),
];

test.describe('buildPriceSeries: tramo antes de un "sin stock"', () => {
    test('cierra el tramo con un punto sintético en la fecha del null', () => {
        const { points } = buildPriceSeries(ALAN_WAKE, 180, NOW);
        const nullAt = Date.parse('2026-08-26T04:00:00+00:00');

        const end = points.find((p) => p.kind === 'end');
        expect(end).toBeDefined();
        expect(end?.t).toBe(nullAt);
        expect(end?.price).toBe(400099);

        // El orden importa: recharts no ordena. Primero el cierre, luego el null.
        const i = points.indexOf(end!);
        expect(points[i - 1].price).toBe(400099);
        expect(points[i + 1].price).toBeNull();
    });

    test('no añade cierre si el null es el primer punto o no hay nulls', () => {
        const sinNulls = buildPriceSeries(
            [pt('2026-09-17T03:00:00+00:00', '39138.00'), pt('2026-08-01T03:00:00+00:00', '45000.00')],
            180,
            NOW,
        );
        expect(sinNulls.points.some((p) => p.kind === 'end')).toBe(false);
    });

    test('el último tramo sigue prolongándose hasta ahora', () => {
        const { points } = buildPriceSeries(ALAN_WAKE, 180, NOW);
        const last = points[points.length - 1];
        expect(last.kind).toBe('now');
        expect(last.price).toBe(39138);
    });

    test('un null arrastrado como borde izquierdo no genera cierre', () => {
        // Sin stock desde antes de la ventana, vuelve a haber en septiembre.
        const { points } = buildPriceSeries(
            [pt('2026-09-17T03:00:00+00:00', '39138.00'), pt('2026-05-01T04:00:00+00:00', null)],
            30,
            NOW,
        );
        expect(points.some((p) => p.kind === 'end')).toBe(false);
        expect(points[0]).toMatchObject({ kind: 'edge', price: null });
    });
});
