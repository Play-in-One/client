import { test, expect } from '@playwright/test';
import {
    DEALS_METHOD_LINE,
    DEALS_SCOPE_NOTE,
    dealAgeLabel,
    dealBadgeLine,
    dealCardGame,
    dealConsoles,
    dealLlmsLine,
    dealsHeading,
    dealsSummarySentence,
} from '../../src/lib/deals';
import type { Deal, DealsResponse, Game, Platform } from '../../src/lib/types';

const PS5: Platform = {
    id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5', long_name: 'PlayStation 5', order: 12,
};
const SWITCH: Platform = {
    id: 2, name: 'switch', slug: 'switch', display_name: 'NS', long_name: 'Nintendo Switch', order: 34,
};

const game = (over: Partial<Game> = {}): Game =>
    ({
        id: 7,
        name: 'Juego X',
        slug: 'juego-x',
        platforms: [PS5, SWITCH],
        image: null,
        min_price: '19990.00',
        min_price_base: '19990.00',
        min_price_shipping: '0.00',
        min_price_seller: { id: 3, name: 'Zmart' },
        min_price_platform: 'ps5',
        min_price_condition: 'new',
        ...over,
    }) as unknown as Game;

const deal = (over: Partial<Deal> = {}): Deal => ({
    game: game(),
    platform: 'ps5',
    current_price: '19990.00',
    typical_price: '29990.00',
    discount_pct: 33.3,
    savings: '10000.00',
    is_all_time_low: true,
    days_on_deal: 1,
    is_new: true,
    seller: { id: 3, name: 'Zmart' },
    condition: 'new',
    ...over,
});

const response = (over: Partial<DealsResponse> = {}): DealsResponse => ({
    date: '2026-10-08',
    last_scrape_at: '2026-10-07T19:28:44.731357Z',
    count: 37,
    results: [deal()],
    ...over,
});

test.describe('dealsSummarySentence', () => {
    test('arma la frase completa con la mayor rebaja y la fecha del scrapeo', () => {
        expect(dealsSummarySentence(response())).toBe(
            '37 juegos están al menos 15% bajo su precio típico de los últimos 90 días. ' +
            'La mayor rebaja es Juego X (PlayStation 5): $19.990 frente a $29.990 habitual (−33%) en Zmart (nuevo). ' +
            'Precios con envío incluido; datos del scrapeo del 7 de octubre de 2026.',
        );
    });

    test('con consola la nombra en la cifra y no la repite tras el juego', () => {
        expect(dealsSummarySentence(response({ count: 4 }), PS5)).toBe(
            '4 juegos de PlayStation 5 están al menos 15% bajo su precio típico de los últimos 90 días. ' +
            'La mayor rebaja es Juego X: $19.990 frente a $29.990 habitual (−33%) en Zmart (nuevo). ' +
            'Precios con envío incluido; datos del scrapeo del 7 de octubre de 2026.',
        );
    });

    test('un solo juego va en singular y los miles con separador es-CL', () => {
        expect(dealsSummarySentence(response({ count: 1 }))).toMatch(/^1 juego está al menos/);
        expect(dealsSummarySentence(response({ count: 1234 }))).toMatch(/^1\.234 juegos están/);
    });

    test('omite las cláusulas sin dato: tienda, consola y fecha', () => {
        const text = dealsSummarySentence(
            response({
                last_scrape_at: null,
                results: [deal({ seller: null, platform: 'xboxone' })],
            }),
        );
        expect(text).toBe(
            '37 juegos están al menos 15% bajo su precio típico de los últimos 90 días. ' +
            'La mayor rebaja es Juego X: $19.990 frente a $29.990 habitual (−33%, nuevo). ' +
            'Precios con envío incluido.',
        );
        expect(text).not.toContain('scrapeo');
    });

    test('sin ofertas da la frase del estado vacío, también por consola', () => {
        const empty = response({ count: 0, results: [] });
        expect(dealsSummarySentence(empty)).toBe(
            'Hoy no hay juegos 15% bajo su precio típico. Datos del scrapeo del 7 de octubre de 2026.',
        );
        expect(dealsSummarySentence({ ...empty, last_scrape_at: null }, SWITCH)).toBe(
            'Hoy no hay juegos de Nintendo Switch 15% bajo su precio típico.',
        );
    });
});

test.describe('dealBadgeLine', () => {
    test('nombra la condición, redondea el descuento y da el típico en CLP', () => {
        expect(dealBadgeLine(deal())).toBe('Nuevo · −33% · típico $29.990');
        expect(dealBadgeLine(deal({ condition: 'digital' }))).toBe('Digital · −33% · típico $29.990');
        expect(
            dealBadgeLine(deal({ condition: 'used', discount_pct: 32.5, typical_price: '1234567.00' })),
        ).toBe('Usado · −33% · típico $1.234.567');
    });
});

test('la frase nombra la condición de la mayor rebaja tras la tienda', () => {
    const text = dealsSummarySentence(response({ results: [deal({ condition: 'digital' })] }));
    expect(text).toContain('(−33%) en Zmart (digital).');
});

test.describe('dealAgeLabel', () => {
    test('«Nueva hoy» el primer día', () => {
        expect(dealAgeLabel(deal({ is_new: true, days_on_deal: 1 }))).toBe('Nueva hoy');
    });

    test('«N días en oferta» después', () => {
        expect(dealAgeLabel(deal({ is_new: false, days_on_deal: 4 }))).toBe('4 días en oferta');
        expect(dealAgeLabel(deal({ is_new: false, days_on_deal: 1 }))).toBe('1 día en oferta');
    });
});

test.describe('dealsHeading', () => {
    test('global y por consola, con el nombre largo', () => {
        expect(dealsHeading()).toBe('Ofertas de videojuegos en Chile hoy');
        expect(dealsHeading(SWITCH)).toBe('Ofertas de Nintendo Switch hoy');
    });
});

test('la línea de método y la nota de alcance son fijas', () => {
    expect(DEALS_METHOD_LINE).toBe(
        'Una oferta aparece aquí cuando el precio más bajo de hoy está al menos 15% bajo su ' +
        'mediana de los últimos 90 días y ahorra $1.000 o más.',
    );
    expect(DEALS_SCOPE_NOTE).toBe('Calculadas sobre todas las tiendas y condiciones.');
});

test.describe('dealCardGame', () => {
    test('si el mínimo del juego ES la oferta, deja el juego intacto (con su desglose)', () => {
        const d = deal();
        expect(dealCardGame(d)).toBe(d.game);
    });

    test('si el mínimo del catálogo es otra oferta, la tarjeta muestra la de la oferta', () => {
        const d = deal({
            game: game({ min_price: '9990.00', min_price_platform: 'switch', min_price_condition: 'used' }),
        });
        const card = dealCardGame(d);
        expect(card.min_price).toBe('19990.00');
        expect(card.min_price_platform).toBe('ps5');
        expect(card.min_price_condition).toBe('new');
        // Sin desglose ni tienda: no se conocen para ESTA oferta, y mezclarlos
        // con los del otro mínimo mostraría un total que no cuadra.
        expect(card.min_price_base).toBeNull();
        expect(card.min_price_shipping).toBeNull();
        expect(card.min_price_seller).toBeNull();
        expect(card.min_price_is_affiliate).toBe(false);
        // El resto del juego no cambia.
        expect(card.name).toBe('Juego X');
        expect(card.platforms).toEqual([PS5, SWITCH]);
    });

    test('el bucket digital no dice si es Store o código: la tarjeta no pinta icono', () => {
        const d = deal({ condition: 'digital', game: game({ min_price: '1.00' }) });
        expect(dealCardGame(d).min_price_condition).toBeNull();
    });
});

test.describe('dealConsoles', () => {
    test('consolas únicas de las ofertas, en el orden de negocio', () => {
        const deals = [
            deal({ platform: 'switch' }),
            deal({ platform: 'ps5' }),
            deal({ platform: 'switch' }),
            // Un slug que el juego no declara no tiene nombre que mostrar.
            deal({ platform: 'xboxone' }),
        ];
        expect(dealConsoles(deals).map((p) => p.slug)).toEqual(['ps5', 'switch']);
    });
});

test.describe('dealLlmsLine', () => {
    test('enlace a la ficha en la consola de la oferta, precio y rebaja', () => {
        const line = dealLlmsLine(deal({ game: game({ name: 'Juego [Edición] X' }) }));
        expect(line).toMatch(
            /^- \[Juego \\\[Edición\\\] X \(PlayStation 5, nuevo\)\]\(https?:\/\/[^)]+\/juego\/juego-x-7\?platform=ps5\): \$19\.990, −33% frente a su precio típico de \$29\.990$/,
        );
    });
});
