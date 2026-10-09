import { FALLBACK_PLATFORM_ICON, PLATFORMS_BY_SLUG } from '@/lib/platforms';

/**
 * La consola del precio de una tarjeta: logo y nombre corto, junto al precio
 * y antes de la rebaja «↓N% (i)» si la hay. Va en todas las tarjetas con
 * precio, no solo en las ofertas.
 *
 * Logo Y nombre: el logo es por familia (PS3, PS4 y PS5 comparten el de
 * PlayStation), así que solo con él no se sabría cuál es. Recibe la consola de
 * la oferta que fija el precio mostrado (`min_price_platform`, o la fila de
 * `deal` que `attach_card_deals` y `dealCardGame` hacen coincidir con él).
 *
 * Sin estado ni `'use client'`: sirve también en Server Components.
 */
export default function DealConsoleTag({ platform }: { platform: string }) {
    const console_ = PLATFORMS_BY_SLUG[platform];
    if (!console_) return null;
    const Icon = console_.icon ?? FALLBACK_PLATFORM_ICON;
    return (
        <span className="pio-deal-console" title={`Precio en ${console_.long}`} data-deal-console={platform}>
            <Icon size={12} aria-hidden />
            {console_.short}
        </span>
    );
}
