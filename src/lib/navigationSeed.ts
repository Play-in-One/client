import { useSyncExternalStore, type MouseEvent } from 'react';
import type { Game, Platform } from './types';

/**
 * Ficha instantánea: lo que una tarjeta ya sabe de su ficha, para pintarla en
 * el mismo clic.
 *
 * Las fichas de juego y de consola no se precargan (`GAME_LINK_PREFETCH`,
 * `CONSOLE_LINK_PREFETCH`): sin precarga, entre el clic y la primera respuesta
 * del servidor hay un viaje de ida y vuelta (1-4 s medidos en producción) en
 * el que la pantalla no cambia. Pero la tarjeta ya tiene el nombre, la
 * portada, las consolas y el precio. Al hacer clic deja aquí esa "semilla" y:
 *
 * 1. `ViewTransition` tapa la página anterior con `InstantDetailOverlay`, que
 *    pinta la ficha con la semilla ANTES de que responda el servidor.
 * 2. Cuando la navegación se confirma (cambia el pathname), el overlay se
 *    retira y el fallback de la ruta (`loading.tsx` de la ficha, el de
 *    consola) lee la MISMA semilla y pinta lo mismo, en el mismo sitio.
 * 3. El preview del servidor y la ficha completa ocupan esas mismas cajas.
 *
 * Solo existe en la navegación del cliente. En un documento el almacén está
 * vacío y el valor de servidor de `useSeed` es `null`, así que el HTML, el
 * SEO y los 404/308 reales no cambian.
 *
 * Estado de módulo con UNA entrada (`pending`) y la última semilla (`last`):
 * memoria constante, y la imagen viaja como URL, no como datos.
 */

export interface SeedPrice {
    /** Precio efectivo (con envío), el mismo que muestra la tarjeta. */
    amount: string;
    shipping: string | null;
    condition: string | null;
    seller: { id: number; name: string } | null;
}

export interface GameSeed {
    kind: 'game';
    id: number;
    name: string;
    slug?: string | null;
    image: string | null;
    platforms: Platform[];
    /** La consola con la que abre la ficha (la del precio de la tarjeta). */
    selectedPlatform: string | null;
    price: SeedPrice | null;
    /** `currentSrc` de la portada YA decodificada en la tarjeta. */
    placeholderSrc?: string;
}

export interface ConsoleSeed {
    kind: 'console';
    id: number;
    name: string;
    image: string | null;
    platform: Platform;
    minPrice: string | null;
    sellerCount: number;
    placeholderSrc?: string;
}

export interface PostSeed {
    kind: 'post';
    id: number;
    title: string;
    image: string | null;
    category: string;
    categoryLabel: string;
    date: string;
    placeholderSrc?: string;
}

export type NavigationSeed = GameSeed | ConsoleSeed | PostSeed;
type SeedKind = NavigationSeed['kind'];
type SeedOf<K extends SeedKind> = Extract<NavigationSeed, { kind: K }>;

export interface PendingNavigation {
    token: number;
    seed: NavigationSeed;
    /** Pathname de destino, tal como lo pidió la tarjeta. */
    href: string;
    /** Dónde estaba la persona al hacer clic: el overlay solo se ve aquí. */
    fromPathname: string;
}

/** Más que esto sin respuesta y el overlay se retira: queda el velo de la
 *  tarjeta, que sigue diciendo que el clic está en curso. */
export const SEED_TIMEOUT_MS = 15_000;

const SEED_PATH = /^\/(juego|consola|blog)\/(?:.+-)?(\d+)\/?$/;
const KIND_BY_SEGMENT: Record<string, SeedKind> = { juego: 'game', consola: 'console', blog: 'post' };

let pending: PendingNavigation | null = null;
let last: NavigationSeed | null = null;
let tokens = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function onPopState() {
    // Atrás/adelante mientras la ficha no responde: la persona ya se fue.
    cancelSeededNavigation();
}

function clearWatchers() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (typeof window !== 'undefined') window.removeEventListener('popstate', onPopState);
}

function decodePath(pathname: string): string {
    try {
        return decodeURI(pathname).replace(/\/$/, '') || '/';
    } catch {
        return pathname;
    }
}

/** Mismo pathname aunque uno venga codificado (`window.location`) y el otro
 *  no (`usePathname`), o con barra final. */
export function samePath(a: string, b: string): boolean {
    return a === b || decodePath(a) === decodePath(b);
}

/** `{ kind, id }` de una ruta de ficha, o null si no es una. */
export function seedTarget(pathname: string): { kind: SeedKind; id: string } | null {
    const match = SEED_PATH.exec(pathname);
    return match ? { kind: KIND_BY_SEGMENT[match[1]], id: match[2] } : null;
}

/** La semilla corresponde a esta ruta. Compara por id, no por slug: un 308 al
 *  slug canónico sigue siendo la misma ficha. */
export function seedMatches(seed: NavigationSeed, pathname: string): boolean {
    const target = seedTarget(pathname);
    return !!target && target.kind === seed.kind && target.id === String(seed.id);
}

export function beginSeededNavigation(seed: NavigationSeed, href: string, fromPathname: string): number {
    clearWatchers();
    const token = ++tokens;
    pending = { token, seed, href, fromPathname };
    last = seed;
    timer = setTimeout(() => cancelSeededNavigation(token), SEED_TIMEOUT_MS);
    window.addEventListener('popstate', onPopState);
    emit();
    return token;
}

/** Retira el overlay. Con `token`, solo si sigue siendo esa navegación. */
export function cancelSeededNavigation(token?: number): void {
    if (!pending || (token !== undefined && pending.token !== token)) return;
    clearWatchers();
    pending = null;
    emit();
}

/**
 * La llama `ViewTransition` con cada pathname confirmado. Si la navegación
 * pendiente salió de su página de origen, terminó (al destino, a un 404, a un
 * redirect o a otro enlace): el overlay se retira. La semilla se conserva solo
 * mientras la ruta sea su ficha, para que el fallback de la ruta la lea; al
 * salir se descarta, y volver más tarde nunca muestra un precio viejo.
 */
export function settleSeededNavigation(pathname: string): void {
    let changed = false;
    if (pending && !samePath(pathname, pending.fromPathname)) {
        clearWatchers();
        pending = null;
        changed = true;
    }
    if (!pending && last && !seedMatches(last, pathname)) {
        last = null;
        changed = true;
    }
    if (changed) emit();
}

export function getPendingNavigation(): PendingNavigation | null {
    return pending;
}

export function usePendingNavigation(): PendingNavigation | null {
    return useSyncExternalStore(subscribe, getPendingNavigation, () => null);
}

/** La semilla de ESTA ficha, o null. En el servidor siempre null. */
export function useSeed<K extends SeedKind>(kind: K, id: string | number | null | undefined): SeedOf<K> | null {
    return useSyncExternalStore(
        subscribe,
        () => (last && id != null && last.kind === kind && String(last.id) === String(id) ? (last as SeedOf<K>) : null),
        () => null,
    );
}

/** La semilla de un juego de galería: su precio es el de `min_price_platform`
 *  (el que muestra la tarjeta), y la ficha abre en esa consola. */
export function gameSeedFrom(game: Game, selectedPlatform?: string | null): GameSeed {
    const platform = selectedPlatform ?? game.min_price_platform ?? game.platforms[0]?.slug ?? null;
    return {
        kind: 'game',
        id: game.id,
        name: game.name,
        slug: game.slug,
        image: game.image ?? null,
        platforms: game.platforms,
        selectedPlatform: platform,
        price: game.min_price != null && platform === game.min_price_platform ? {
            amount: String(game.min_price),
            shipping: game.min_price_shipping ?? null,
            condition: game.min_price_condition ?? null,
            seller: game.min_price_seller ? { id: game.min_price_seller.id, name: game.min_price_seller.name } : null,
        } : null,
    };
}

/** Clic que abre la ficha en ESTA pestaña: botón principal, sin modificadores
 *  ni `target=_blank`, y no cancelado por otro manejador (modo selección). */
export function isPlainNavigationClick(event: MouseEvent<HTMLElement>): boolean {
    const anchor = event.currentTarget.closest('a');
    return !event.defaultPrevented && event.button === 0
        && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
        && anchor?.getAttribute('target') !== '_blank';
}

/** La portada que la tarjeta ya pintó: solo si terminó de cargar, para que el
 *  placeholder no sea a su vez una imagen a medio bajar. */
export function capturedImage(root: Element): string | undefined {
    const img = root.querySelector('img');
    return img && img.complete && img.naturalWidth > 0 ? img.currentSrc || img.src : undefined;
}

/**
 * Para el `onClick` de una tarjeta: deja la semilla si el clic va a navegar
 * en esta pestaña a otra ruta. No previene nada; el `<Link>` sigue su curso.
 */
export function seedFromClick(event: MouseEvent<HTMLElement>, seed: NavigationSeed, href: string): void {
    if (!isPlainNavigationClick(event)) return;
    const target = new URL(href, window.location.href);
    if (samePath(target.pathname, window.location.pathname)) return;
    beginSeededNavigation(
        { ...seed, placeholderSrc: capturedImage(event.currentTarget) },
        target.pathname,
        window.location.pathname,
    );
}

/* Solo para los tests unitarios. */
export function resetNavigationSeedForTests(): void {
    clearWatchers();
    pending = null;
    last = null;
    emit();
}
