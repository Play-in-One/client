import type { ComponentType } from 'react';
import { PLATFORMS, FALLBACK_PLATFORM_ICON } from '@/lib/platforms';

/* Los tres mapas se derivan del catálogo (`lib/platforms.ts`). Vivían aquí como
   tres listas escritas a mano que había que acordarse de ampliar a la vez; el
   `PLATFORM_SHORT_LABELS` original cubría 9 de las 15 consolas y las otras seis
   caían en `display_name`, que da la misma cadena. */

/** Ícono de marca por slug de plataforma. */
export const PLATFORM_ICONS: Record<
    string,
    ComponentType<{ size?: number; className?: string; color?: string }>
> = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.icon]));

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
