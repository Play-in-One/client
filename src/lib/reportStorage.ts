import type { ReportReason, ReportTargetType } from './types';

export const REPORT_REASONS: Record<ReportTargetType, { value: ReportReason; label: string }[]> = {
    game: [
        { value: 'image_not_official', label: 'No es la oficial' },
        { value: 'image_wrong_game', label: 'Es otro juego' },
        { value: 'image_not_loading', label: 'No carga' },
        { value: 'image_low_quality', label: 'Es de mala calidad' },
    ],
    product: [
        { value: 'price_incorrect', label: 'Precio Incorrecto' },
        { value: 'game_incorrect', label: 'Juego Incorrecto' },
        { value: 'out_of_stock', label: 'Producto sin stock' },
        { value: 'console_incorrect', label: 'Consola incorrecta' },
    ],
};

const PREFIX = 'pio:report:';
const memory = new Map<string, string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function reportDay(): string {
    const parts = dateFormatter.formatToParts(new Date());
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

function key(type: ReportTargetType, id: number): string {
    return `${PREFIX}${type}:${id}`;
}

function notify() {
    for (const listener of listeners) listener();
}

export function getReportState(type: ReportTargetType, id: number): 'ready' | 'pending' | 'blocked' {
    const storageKey = key(type, id);
    if (pending.has(storageKey)) return 'pending';
    const today = reportDay();
    if (memory.get(storageKey) === today) return 'blocked';
    let day = memory.get(storageKey);
    try { day = window.localStorage.getItem(storageKey) ?? day; } catch { /* memory fallback */ }
    return day === today ? 'blocked' : 'ready';
}

export function beginReport(type: ReportTargetType, id: number): boolean {
    if (getReportState(type, id) !== 'ready') return false;
    pending.add(key(type, id));
    notify();
    return true;
}

export function finishReport(type: ReportTargetType, id: number, day?: string): void {
    const storageKey = key(type, id);
    if (day) {
        memory.set(storageKey, day);
        try { window.localStorage.setItem(storageKey, day); } catch { /* memory fallback */ }
    }
    pending.delete(storageKey);
    notify();
}

/** The browser owns this lock: simultaneous tabs cannot POST the same target.
 * Browsers without Web Locks still get the local daily marker and double-click guard. */
export async function runReport(type: ReportTargetType, id: number, submit: () => Promise<void>): Promise<void> {
    const execute = async () => {
        if (!beginReport(type, id)) return;
        try { await submit(); } finally { finishReport(type, id); }
    };
    if (navigator.locks) {
        await navigator.locks.request(key(type, id), { ifAvailable: true }, async lock => {
            if (lock) await execute();
        });
    } else {
        await execute();
    }
}

let stopWatching: (() => void) | undefined;

export function subscribeReports(listener: () => void): () => void {
    listeners.add(listener);
    if (!stopWatching) {
        const onStorage = (event: StorageEvent) => {
            if (event.key === null || event.key.startsWith(PREFIX)) {
                if (event.key) memory.delete(event.key);
                else memory.clear();
                notify();
            }
        };
        window.addEventListener('storage', onStorage);
        window.addEventListener('focus', notify);
        window.addEventListener('visibilitychange', notify);
        // One timer for every report button; renews the day on pages left open.
        const timer = window.setInterval(notify, 30_000);
        stopWatching = () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('focus', notify);
            window.removeEventListener('visibilitychange', notify);
            window.clearInterval(timer);
        };
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            stopWatching?.();
            stopWatching = undefined;
        }
    };
}
