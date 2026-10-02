import { test, expect } from '@playwright/test';
import {
    DEFAULT_PREFS,
    isDefaultPrefs,
    isSellerVisible,
    parsePrefs,
    sellerLocationsFor,
    type Prefs,
} from '../../src/lib/prefs';
import { CHILE_REGIONS, REGION_CODES, isRegionCode } from '../../src/lib/chile-regions';

const prefs = (over: Partial<Prefs> = {}): Prefs => ({ ...DEFAULT_PREFS, ...over });
const seller = (location: string) => ({ location, is_international: location === 'international' });

test('region catalogue has the 16 regions with ISO codes, Ñuble as CL-NB', () => {
    expect(CHILE_REGIONS).toHaveLength(16);
    expect(new Set(REGION_CODES).size).toBe(16);
    expect(REGION_CODES).toContain('CL-NB');
    expect(REGION_CODES).not.toContain('CL-NU');
    expect(isRegionCode('CL-RM')).toBe(true);
    expect(isRegionCode('CL-XX')).toBe(false);
    expect(isRegionCode(null)).toBe(false);
});

test('default prefs show every location and are default', () => {
    expect(DEFAULT_PREFS).toMatchObject({ international: true, national: true, region: null });
    expect(isDefaultPrefs(DEFAULT_PREFS)).toBe(true);
    expect(isDefaultPrefs(prefs({ national: false }))).toBe(false);
    expect(isDefaultPrefs(prefs({ region: 'CL-BI' }))).toBe(false);
});

test('parsePrefs keeps a pre-region cookie working and rejects junk', () => {
    // Cookie anterior a las dimensiones nuevas: cae en el default de cada una.
    expect(parsePrefs(JSON.stringify({ condition: 'new', format: 'all', digital: 'all', international: false })))
        .toEqual(prefs({ condition: 'new', international: false }));
    expect(parsePrefs(JSON.stringify({ national: false, region: 'CL-VS' })))
        .toEqual(prefs({ national: false, region: 'CL-VS' }));
    // Región inventada o de otro tipo → null (sin filtro), nunca un valor que el backend rechace.
    expect(parsePrefs(JSON.stringify({ region: 'CL-ZZ' })).region).toBeNull();
    expect(parsePrefs(JSON.stringify({ region: 7, national: 'no' }))).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{no json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
});

test('sellerLocationsFor is undefined when nothing is restricted', () => {
    expect(sellerLocationsFor(DEFAULT_PREFS)).toBeUndefined();
});

test('sellerLocationsFor builds the allow-list the API expects', () => {
    expect(sellerLocationsFor(prefs({ international: false }))).toBe('national,regions');
    expect(sellerLocationsFor(prefs({ national: false }))).toBe('international,regions');
    expect(sellerLocationsFor(prefs({ international: false, national: false }))).toBe('regions');
    expect(sellerLocationsFor(prefs({ region: 'CL-BI' }))).toBe('international,national,CL-BI');
    expect(sellerLocationsFor(prefs({ region: 'CL-BI', national: false }))).toBe('international,CL-BI');
    expect(sellerLocationsFor(prefs({ region: 'CL-BI', international: false, national: false }))).toBe('CL-BI');
});

test('isSellerVisible: each category answers to its own control', () => {
    expect(isSellerVisible(seller('international'), DEFAULT_PREFS)).toBe(true);
    expect(isSellerVisible(seller('national'), DEFAULT_PREFS)).toBe(true);
    expect(isSellerVisible(seller('CL-BI'), DEFAULT_PREFS)).toBe(true);

    expect(isSellerVisible(seller('international'), prefs({ international: false }))).toBe(false);
    expect(isSellerVisible(seller('national'), prefs({ international: false }))).toBe(true);

    expect(isSellerVisible(seller('national'), prefs({ national: false }))).toBe(false);
    expect(isSellerVisible(seller('international'), prefs({ national: false }))).toBe(true);
    expect(isSellerVisible(seller('CL-BI'), prefs({ national: false }))).toBe(true);
});

test('isSellerVisible: a chosen region keeps only that region, not national or other regions', () => {
    const biobio = prefs({ region: 'CL-BI' });
    expect(isSellerVisible(seller('CL-BI'), biobio)).toBe(true);
    expect(isSellerVisible(seller('CL-RM'), biobio)).toBe(false);
    // Nacional e internacional siguen sus propios controles, en paralelo.
    expect(isSellerVisible(seller('national'), biobio)).toBe(true);
    expect(isSellerVisible(seller('international'), biobio)).toBe(true);
    expect(isSellerVisible(seller('national'), prefs({ region: 'CL-BI', national: false }))).toBe(false);
});

test('isSellerVisible falls back to is_international for an old backend without location', () => {
    expect(isSellerVisible({ is_international: true }, prefs({ international: false }))).toBe(false);
    expect(isSellerVisible({ is_international: false }, prefs({ international: false }))).toBe(true);
});

test('isSellerVisible is exactly the client twin of sellerLocationsFor', () => {
    const locations = ['international', 'national', ...REGION_CODES];
    for (const international of [true, false]) {
        for (const national of [true, false]) {
            for (const region of [null, 'CL-RM', 'CL-MA'] as const) {
                const p = prefs({ international, national, region });
                const param = sellerLocationsFor(p);
                // Igual que `allowed_locations` del backend: `regions` son las 16.
                const tokens = param ? param.split(',').flatMap((t): string[] => (t === 'regions' ? [...REGION_CODES] : [t])) : locations;
                const allowed = new Set<string>(tokens);
                for (const loc of locations) {
                    expect(isSellerVisible(seller(loc), p), `${loc} @ ${JSON.stringify(p)}`).toBe(allowed.has(loc));
                }
            }
        }
    }
});
