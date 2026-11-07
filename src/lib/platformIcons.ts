import type { ComponentType } from 'react';
import { createElement } from 'react';
import { PLATFORMS, FALLBACK_PLATFORM_ICON } from '@/lib/platforms';

/* Los tres mapas se derivan del catálogo (`lib/platforms.ts`). Vivían aquí como
   tres listas escritas a mano que había que acordarse de ampliar a la vez; el
   `PLATFORM_SHORT_LABELS` original cubría 9 de las 15 consolas y las otras seis
   caían en `display_name`, que da la misma cadena. */

/** Ícono de marca por slug de plataforma. */
export const PLATFORM_ICONS: Record<
    string,
    ComponentType<{ size?: number; className?: string; color?: string }>
> = Object.fromEntries(PLATFORMS.map((p) => {
    const symbol = p.family === 'playstation' || p.family === 'xbox' ? p.family
        : p.slug === 'switch' || p.slug === 'switch2' ? 'switch'
            : ['win', 'mac', 'linux'].includes(p.slug) ? p.slug : null;
    if (!symbol) return [p.slug, p.icon];
    function SpriteIcon({ size = 24, className, color }: { size?: number; className?: string; color?: string }) {
        return createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', className, color, 'aria-hidden': true, focusable: false },
            createElement('use', { href: `/platform-icons.svg#${symbol}`, width: 24, height: 24 }));
    }
    return [p.slug, SpriteIcon];
}));

/** Nombre completo de la consola, para selectores anchos (desktop). El
 * `display_name` del backend es ya una abreviatura ("PS5", "Switch"), así que no
 * sirve como versión larga. */
export const PLATFORM_LONG_LABELS: Record<string, string> = Object.fromEntries(
    PLATFORMS.map((p) => [p.slug, p.long]),
);

/** Nombres cortos, para selectores angostos (mobile, el selector del detalle). */
export const PLATFORM_SHORT_LABELS: Record<string, string> = Object.fromEntries(
    PLATFORMS.map((p) => [p.slug, p.short]),
);

export { FALLBACK_PLATFORM_ICON };
