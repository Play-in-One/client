'use client';

import { CHILE_MAP_VIEWBOX, CHILE_REGIONS, type RegionCode } from '@/lib/chile-regions';

interface Props {
    /** Región elegida; `null` = ninguna. */
    value: RegionCode | null;
    /** Recibe el código clicado, o `null` si se vuelve a clicar la ya elegida. */
    onChange: (region: RegionCode | null) => void;
    /** Región bajo el puntero o con foco, para que quien la rodea muestre su
     *  nombre: las regiones del centro miden pocos píxeles y el mapa solo no
     *  dice cuál se está apuntando. */
    onHoverChange?: (region: RegionCode | null) => void;
    /** Alto del SVG en píxeles; el ancho sale del `viewBox` (el país es una tira). */
    height?: number;
}

/** Mapa de las 16 regiones de Chile, sin comunas. Controlado: no guarda estado.
 *
 * Cada región es un botón de teclado (Tab para entrar, Enter o Espacio para
 * elegir) con su nombre como `<title>`, y los colores salen de variables CSS
 * (`.chile-map__region` en globals.css) para que sigan el tema claro/oscuro. */
export default function ChileRegionMap({ value, onChange, onHoverChange, height = 340 }: Props) {
    const [, , vbWidth, vbHeight] = CHILE_MAP_VIEWBOX.split(' ').map(Number);
    const width = Math.round((height * vbWidth) / vbHeight);

    return (
        <svg
            className="chile-map"
            viewBox={CHILE_MAP_VIEWBOX}
            width={width}
            height={height}
            role="group"
            aria-label="Regiones de Chile"
            onPointerLeave={() => onHoverChange?.(null)}
        >
            {CHILE_REGIONS.map((region) => {
                const selected = value === region.code;
                const select = () => onChange(selected ? null : region.code);
                return (
                    <path
                        key={region.code}
                        className="chile-map__region"
                        d={region.d}
                        role="button"
                        tabIndex={0}
                        aria-label={region.name}
                        aria-pressed={selected}
                        data-selected={selected || undefined}
                        onClick={select}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            select();
                        }}
                        onPointerEnter={() => onHoverChange?.(region.code)}
                        onFocus={() => onHoverChange?.(region.code)}
                        onBlur={() => onHoverChange?.(null)}
                    >
                        <title>{region.name}</title>
                    </path>
                );
            })}
        </svg>
    );
}
