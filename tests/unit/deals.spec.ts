import { test, expect } from '@playwright/test';
import {
    DEALS_METHOD_LINE,
    DEALS_SCOPE_NOTE,
    DEALS_TYPICAL_NOTE,
    dealAgeLabel,
    dealBadgeLine,
    dealCardGame,
    dealConsoleChipLabel,
    dealConsoleChips,
    dealConsoleSlugs,
    dealConsoles,
    dealFromGame,
    dealLlmsLine,
    dealsAgeDays,
    dealsHeading,
    dealsPageView,
    dealsSectionTitle,
    dealsSummarySentence,
    isTodayDeals,
    santiagoDate,
    DEALS_ORDERING,
    DEALS_UNAVAILABLE,
    gameWithDeal,
} from '../../src/lib/deals';
import { itemListJsonLd } from '../../src/lib/seo';
import type { Deal, DealsResponse, Game, Platform } from '../../src/lib/types';

/** «Ahora» fijo: el mediodía del 8 de octubre de 2026 en Chile, el mismo día
 *  que la tanda de `response()`. Sin inyectarlo, los textos dependerían del
 *  día en que corre el test. */
const NOW = new Date('2026-10-08T15:00:00Z');
/** Dos días después de la tanda (aún indexable) y tres (ya no). */
const TWO_DAYS_LATER = new Date('2026-10-10T15:00:00Z');
const THREE_DAYS_LATER = new Date('2026-10-11T15:00:00Z');

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
        expect(dealsSummarySentence(response(), undefined, NOW)).toBe(
            '37 juegos están al menos 15% bajo su precio típico de los últimos 90 días. ' +
            'La mayor rebaja es Juego X (PlayStation 5): $19.990 frente a $29.990 habitual (−33%) en Zmart (nuevo). ' +
            'Precios con envío incluido; datos del scrapeo del 7 de octubre de 2026.',
        );
    });

    test('con consola la nombra en la cifra y no la repite tras el juego', () => {
        expect(dealsSummarySentence(response({ count: 4 }), PS5, NOW)).toBe(
            '4 juegos de PlayStation 5 están al menos 15% bajo su precio típico de los últimos 90 días. ' +
            'La mayor rebaja es Juego X: $19.990 frente a $29.990 habitual (−33%) en Zmart (nuevo). ' +
            'Precios con envío incluido; datos del scrapeo del 7 de octubre de 2026.',
        );
    });

    test('un solo juego va en singular y los miles con separador es-CL', () => {
        expect(dealsSummarySentence(response({ count: 1 }), undefined, NOW)).toMatch(/^1 juego está al menos/);
        expect(dealsSummarySentence(response({ count: 1234 }), undefined, NOW)).toMatch(/^1\.234 juegos están/);
    });

    test('omite las cláusulas sin dato: tienda, consola y fecha', () => {
        const text = dealsSummarySentence(
            response({
                last_scrape_at: null,
                results: [deal({ seller: null, platform: 'xboxone' })],
            }),
            undefined,
            NOW,
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
        expect(dealsSummarySentence(empty, undefined, NOW)).toBe(
            'Hoy no hay juegos 15% bajo su precio típico. Datos del scrapeo del 7 de octubre de 2026.',
        );
        expect(dealsSummarySentence({ ...empty, last_scrape_at: null }, SWITCH, NOW)).toBe(
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
    const text = dealsSummarySentence(response({ results: [deal({ condition: 'digital' })] }), undefined, NOW);
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

test.describe('ofertas que no son de hoy (el cálculo de la noche no corrió)', () => {
    test('isTodayDeals compara con el día de Chile, no con el de UTC', () => {
        expect(isTodayDeals(response(), NOW)).toBe(true);
        expect(isTodayDeals(response(), TWO_DAYS_LATER)).toBe(false);
        // 23:30 del 8 en Chile ya es el 9 en UTC: sigue siendo «hoy».
        expect(isTodayDeals(response(), new Date('2026-10-09T02:30:00Z'))).toBe(true);
        // 00:30 del 9 en Chile (03:30 UTC): ya no.
        expect(isTodayDeals(response(), new Date('2026-10-09T03:30:00Z'))).toBe(false);
        expect(santiagoDate(new Date('2026-10-09T02:30:00Z'))).toBe('2026-10-08');
        expect(isTodayDeals(response({ date: null }), NOW)).toBe(false);
    });

    test('el título dice la fecha de la tanda en vez de «hoy»', () => {
        const res = response();
        expect(dealsHeading(undefined, res, NOW)).toBe('Ofertas de videojuegos en Chile hoy');
        expect(dealsHeading(undefined, res, TWO_DAYS_LATER)).toBe(
            'Ofertas de videojuegos en Chile del 8 de octubre de 2026',
        );
        expect(dealsHeading(SWITCH, res, TWO_DAYS_LATER)).toBe('Ofertas de Nintendo Switch del 8 de octubre de 2026');
    });

    test('la frase pasa a pasado, con la fecha y sin «hoy»', () => {
        expect(dealsSummarySentence(response(), undefined, TWO_DAYS_LATER)).toBe(
            'El 8 de octubre de 2026, 37 juegos estaban al menos 15% bajo su precio típico de los últimos 90 días. ' +
            'La mayor rebaja era Juego X (PlayStation 5): $19.990 frente a $29.990 habitual (−33%) en Zmart (nuevo). ' +
            'Precios con envío incluido; datos del scrapeo del 7 de octubre de 2026.',
        );
        expect(dealsSummarySentence(response({ count: 1 }), PS5, TWO_DAYS_LATER)).toMatch(
            /^El 8 de octubre de 2026, 1 juego de PlayStation 5 estaba al menos/,
        );
        const empty = dealsSummarySentence(response({ count: 0, results: [] }), SWITCH, TWO_DAYS_LATER);
        expect(empty).toBe(
            'El 8 de octubre de 2026 no había juegos de Nintendo Switch 15% bajo su precio típico. ' +
            'Datos del scrapeo del 7 de octubre de 2026.',
        );
        expect(empty).not.toMatch(/hoy/i);
    });

    test('las tarjetas no dicen «Nueva hoy», pero sí los días en oferta', () => {
        expect(dealAgeLabel(deal({ is_new: true, days_on_deal: 1 }), false)).toBeNull();
        expect(dealAgeLabel(deal({ is_new: false, days_on_deal: 4 }), false)).toBe('4 días en oferta');
        expect(dealAgeLabel(deal({ is_new: true, days_on_deal: 1 }), true)).toBe('Nueva hoy');
    });

    test('la sección de la portada y de llms.txt lleva la fecha', () => {
        expect(dealsSectionTitle(response(), NOW)).toBe('Ofertas de hoy');
        expect(dealsSectionTitle(response(), TWO_DAYS_LATER)).toBe('Ofertas del 8 de octubre de 2026');
        expect(dealsSectionTitle({ date: null }, NOW)).toBe('Ofertas de hoy');
    });

    test('se indexa hasta 2 días de antigüedad; con más, noindex', () => {
        expect(dealsAgeDays(response(), NOW)).toBe(0);
        expect(dealsAgeDays(response(), TWO_DAYS_LATER)).toBe(2);
        expect(dealsPageView(response(), { now: NOW }).noIndex).toBe(false);
        expect(dealsPageView(response(), { now: TWO_DAYS_LATER }).noIndex).toBe(false);
        expect(dealsPageView(response(), { now: THREE_DAYS_LATER }).noIndex).toBe(true);
        expect(dealsPageView(response(), { now: NOW }).isToday).toBe(true);
        expect(dealsPageView(response(), { now: TWO_DAYS_LATER }).isToday).toBe(false);
    });
});

test.describe('dealsPageView', () => {
    test('sin ofertas la página no se indexa', () => {
        const view = dealsPageView(response({ count: 0, results: [] }), { now: NOW });
        expect(view.noIndex).toBe(true);
        expect(view.summary).toMatch(/^Hoy no hay juegos/);
    });

    test('si la API falló: texto neutro y noindex, nunca «Hoy no hay juegos…»', () => {
        const empty: DealsResponse = { date: null, last_scrape_at: null, count: 0, platforms: [], results: [] };
        const view = dealsPageView(empty, { failed: true, now: NOW });
        expect(view.summary).toBe('Las ofertas del día no están disponibles en este momento.');
        expect(view.summary).toBe(DEALS_UNAVAILABLE);
        expect(view.noIndex).toBe(true);
        expect(view.summary).not.toContain('no hay juegos');
    });
});

test.describe('itemListJsonLd', () => {
    test('con `withOffers: false` cada elemento lleva solo posición, nombre y URL', () => {
        const games = [game(), game({ id: 8, name: 'Juego Y', slug: 'juego-y', min_price_base: null })];
        const list = itemListJsonLd(games, { path: '/ofertas', name: 'Ofertas', withOffers: false }) as {
            itemListElement: Record<string, unknown>[];
        };
        expect(list.itemListElement).toEqual([
            { '@type': 'ListItem', position: 1, name: 'Juego X', url: expect.stringMatching(/\/juego\/juego-x-7$/) },
            { '@type': 'ListItem', position: 2, name: 'Juego Y', url: expect.stringMatching(/\/juego\/juego-y-8$/) },
        ]);
        expect(JSON.stringify(list)).not.toContain('offers');
    });

    test('por defecto (otras páginas) sigue publicando el Product con su oferta', () => {
        const list = itemListJsonLd([game()], { path: '/', name: 'Destacados' }) as {
            itemListElement: { item: { offers?: unknown } }[];
        };
        expect(list.itemListElement[0].item.offers).toBeDefined();
    });
});

test('la línea de método y la nota de alcance son fijas', () => {
    expect(DEALS_METHOD_LINE).toBe(
        'Una oferta aparece aquí cuando el precio más bajo de hoy está al menos 15% bajo su ' +
        'mediana de los últimos 90 días y ahorra $1.000 o más.',
    );
    expect(DEALS_SCOPE_NOTE).toBe('El precio típico de cada oferta considera todas las tiendas de esa condición; los totales de arriba son del catálogo completo.');
    // La portada no tiene totales encima: allí va solo la primera mitad.
    expect(DEALS_TYPICAL_NOTE).toBe('El precio típico de cada oferta considera todas las tiendas de esa condición.');
});

test.describe('ofertas en la galería (`/api/games/?deals=1`)', () => {
    test('el orden por defecto de /ofertas es la mayor rebaja', () => {
        expect(DEALS_ORDERING).toBe('-deal_discount');
    });

    test('dealFromGame arma la oferta con el juego y su `deal` (sin el `game` anidado)', () => {
        const { game: g, ...offer } = deal({ platform: 'switch', condition: 'used', current_price: '9990.00' });
        const result = dealFromGame({ ...g, deal: offer });
        expect(result).not.toBeNull();
        expect(result!.platform).toBe('switch');
        expect(result!.condition).toBe('used');
        expect(result!.current_price).toBe('9990.00');
        expect(result!.game.id).toBe(g.id);
        // La línea y la tarjeta salen de la oferta, igual que en la grilla del servidor.
        expect(dealBadgeLine(result!)).toBe('Usado · −33% · típico $29.990');
        expect(dealCardGame(result!).min_price).toBe('9990.00');
        expect(dealCardGame(result!).min_price_platform).toBe('switch');
    });

    test('dealFromGame devuelve null para un juego sin oferta (backend sin `deals=1`)', () => {
        expect(dealFromGame(game())).toBeNull();
        expect(dealFromGame({ ...game(), deal: null })).toBeNull();
    });

    test('gameWithDeal es la inversa: el juego de /api/deals/ con su oferta adjunta', () => {
        const d = deal();
        const g = gameWithDeal(d);
        expect(g.id).toBe(d.game.id);
        expect(g.deal).toEqual({
            platform: 'ps5', current_price: '19990.00', typical_price: '29990.00', discount_pct: 33.3,
            savings: '10000.00', is_all_time_low: true, days_on_deal: 1, is_new: true,
            seller: { id: 3, name: 'Zmart' }, condition: 'new',
        });
        const back = dealFromGame(g)!;
        expect(dealBadgeLine(back)).toBe(dealBadgeLine(d));
        expect(dealAgeLabel(back, true)).toBe(dealAgeLabel(d, true));
    });
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

    test('mismo importe y consola pero otra condición: el mínimo NO es la oferta', () => {
        // Un usado a $19.990 en PS5 y la oferta de un nuevo a $19.990 en PS5:
        // devolver el juego tal cual pintaría «Usado» (y su tienda y desglose)
        // sobre la línea «Nuevo · −33%».
        const usedSeller = { ...game().min_price_seller!, id: 9, name: 'Usados SpA' };
        const d = deal({ game: game({ min_price_condition: 'used', min_price_seller: usedSeller }) });
        const card = dealCardGame(d);
        expect(card).not.toBe(d.game);
        expect(card.min_price_condition).toBe('new');
        expect(card.min_price_seller).toBeNull();
    });

    test('el mínimo de una descarga (store/key) ES una oferta del cubo digital', () => {
        for (const stored of ['store', 'key'] as const) {
            const d = deal({ condition: 'digital', game: game({ min_price_condition: stored }) });
            expect(dealCardGame(d)).toBe(d.game);
        }
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

const XBOX: Platform = {
    id: 3, name: 'xboxone', slug: 'xboxone', display_name: 'XOne', long_name: 'Xbox One', order: 20,
};

test.describe('dealConsoleChips', () => {
    test('salen de `platforms`, en su orden y con su conteo, aunque no estén en las tarjetas', () => {
        // Las tarjetas son solo de PS5; Xbox One tiene ofertas fuera del top 60.
        const res = response({
            results: [deal()],
            platforms: [
                { slug: 'ps5', count: 389 },
                { slug: 'xboxone', count: 1204 },
                // Sin nombre conocido (ni en el catálogo ni en las tarjetas): se omite.
                { slug: 'atari', count: 3 },
            ],
        });
        const chips = dealConsoleChips(res, [SWITCH, XBOX]);
        expect(chips.map((c) => [c.platform.slug, c.count])).toEqual([['ps5', 389], ['xboxone', 1204]]);
        expect(chips.map(dealConsoleChipLabel)).toEqual(['PlayStation 5 · 389', 'Xbox One · 1.204']);
    });

    test('sin catálogo, el nombre sale del juego de las tarjetas', () => {
        const res = response({ platforms: [{ slug: 'ps5', count: 2 }] });
        expect(dealConsoleChips(res).map(dealConsoleChipLabel)).toEqual(['PlayStation 5 · 2']);
    });

    test('backend anterior (sin `platforms`): las consolas de las tarjetas, sin conteo', () => {
        const res = response({ results: [deal({ platform: 'switch' }), deal()] });
        const chips = dealConsoleChips(res, [XBOX]);
        expect(chips.map((c) => [c.platform.slug, c.count])).toEqual([['ps5', null], ['switch', null]]);
        expect(chips.map(dealConsoleChipLabel)).toEqual(['PlayStation 5', 'Nintendo Switch']);
    });
});

test.describe('dealConsoleSlugs', () => {
    test('de `platforms` cuando viene, aunque la consola no esté en las tarjetas', () => {
        const res = response({ platforms: [{ slug: 'ps5', count: 1 }, { slug: 'xboxone', count: 4 }] });
        expect(dealConsoleSlugs(res)).toEqual(['ps5', 'xboxone']);
    });

    test('sin `platforms`, de las tarjetas', () => {
        const res = response({ results: [deal({ platform: 'switch' }), deal()] });
        expect(dealConsoleSlugs(res)).toEqual(['ps5', 'switch']);
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
