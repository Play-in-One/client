/* Lightweight region names and codes used by preferences. SVG geometry is
 * loaded with the map only; see chile-region-paths.ts for its source. */

export type RegionCode =
    | 'CL-AP' | 'CL-TA' | 'CL-AN' | 'CL-AT' | 'CL-CO' | 'CL-VS' | 'CL-RM' | 'CL-LI'
    | 'CL-ML' | 'CL-NB' | 'CL-BI' | 'CL-AR' | 'CL-LR' | 'CL-LL' | 'CL-AI' | 'CL-MA';

export interface ChileRegion {
    code: RegionCode;
    /** Código único territorial (CUT) de la región, dos dígitos. */
    cut: string;
    name: string;
}

export const CHILE_REGIONS: readonly ChileRegion[] = [
    { code: 'CL-AP', cut: '15', name: "Arica y Parinacota" },
    { code: 'CL-TA', cut: '01', name: "Tarapacá" },
    { code: 'CL-AN', cut: '02', name: "Antofagasta" },
    { code: 'CL-AT', cut: '03', name: "Atacama" },
    { code: 'CL-CO', cut: '04', name: "Coquimbo" },
    { code: 'CL-VS', cut: '05', name: "Valparaíso" },
    { code: 'CL-RM', cut: '13', name: "Metropolitana de Santiago" },
    { code: 'CL-LI', cut: '06', name: "O'Higgins" },
    { code: 'CL-ML', cut: '07', name: "Maule" },
    { code: 'CL-NB', cut: '16', name: "Ñuble" },
    { code: 'CL-BI', cut: '08', name: "Biobío" },
    { code: 'CL-AR', cut: '09', name: "La Araucanía" },
    { code: 'CL-LR', cut: '14', name: "Los Ríos" },
    { code: 'CL-LL', cut: '10', name: "Los Lagos" },
    { code: 'CL-AI', cut: '11', name: "Aysén" },
    { code: 'CL-MA', cut: '12', name: "Magallanes y la Antártica Chilena" },
];

export const REGION_CODES: readonly RegionCode[] = CHILE_REGIONS.map((r) => r.code);

const REGION_BY_CODE = new Map<string, ChileRegion>(CHILE_REGIONS.map((r) => [r.code, r]));

export function isRegionCode(value: unknown): value is RegionCode {
    return typeof value === 'string' && REGION_BY_CODE.has(value);
}

export function regionName(code: string): string | undefined {
    return REGION_BY_CODE.get(code)?.name;
}
