import type { ProductPreview, ProductPreviewFilters } from './types';

export function previewFilterKey(filters: ProductPreviewFilters): string {
    return JSON.stringify({
        platforms: [...new Set(filters.platforms ?? [])].sort((a, b) => a - b),
        platform: filters.platform ?? '', condition: filters.condition ?? '',
        seller: filters.seller ?? null, seller_locations: filters.seller_locations ?? '',
    });
}

type Entry = {
    id: number; filters: ProductPreviewFilters; group: string; revision: object; version: number;
    listeners: Set<() => void>; state: 'idle' | 'loading' | 'done'; data?: ProductPreview[];
};
type Loader = (ids: number[], filters: ProductPreviewFilters, signal: AbortSignal) => Promise<Record<string, ProductPreview[]>>;

/** Only mounted cards retain previews. Each filter group is fetched in bounded batches. */
export class ProductPreviewStore {
    private entries = new Map<string, Entry>();
    private active = false;
    private session: string | null = null;
    private epoch = 0;
    private timer?: ReturnType<typeof setTimeout>;
    private controllers = new Set<AbortController>();

    constructor(private load: Loader) {}

    configure(active: boolean, session: string | null) {
        if (active === this.active && session === this.session) return;
        this.active = active;
        this.session = session;
        this.epoch++;
        clearTimeout(this.timer);
        this.timer = undefined;
        for (const controller of this.controllers) controller.abort();
        this.controllers.clear();
        for (const entry of this.entries.values()) {
            entry.data = undefined;
            entry.state = 'idle';
            entry.version++;
            entry.listeners.forEach(notify => notify());
        }
        this.schedule();
    }

    getSnapshot(id: number, filters: ProductPreviewFilters) {
        return this.active ? this.entries.get(`${previewFilterKey(filters)}:${id}`)?.data : undefined;
    }

    subscribe(id: number, filters: ProductPreviewFilters, revision: object, notify: () => void) {
        const group = previewFilterKey(filters);
        const key = `${group}:${id}`;
        let entry = this.entries.get(key);
        if (!entry) {
            entry = { id, filters, group, revision, version: 0, listeners: new Set(), state: 'idle' };
            this.entries.set(key, entry);
        } else if (entry.revision !== revision) {
            entry.revision = revision;
            entry.version++;
            entry.data = undefined;
            entry.state = 'idle';
            entry.listeners.forEach(listener => listener());
        }
        entry.listeners.add(notify);
        this.schedule();
        return () => {
            entry.listeners.delete(notify);
            if (!entry.listeners.size && this.entries.get(key) === entry) this.entries.delete(key);
        };
    }

    private schedule() {
        if (!this.active || this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.flush();
        }, 20);
    }

    private flush() {
        if (!this.active) return;
        const groups = new Map<string, Entry[]>();
        for (const entry of this.entries.values()) {
            if (entry.state !== 'idle') continue;
            const group = groups.get(entry.group) ?? [];
            group.push(entry);
            groups.set(entry.group, group);
        }
        for (const group of groups.values()) {
            for (let offset = 0; offset < group.length; offset += 100) this.fetchBatch(group.slice(offset, offset + 100));
        }
    }

    private fetchBatch(entries: Entry[]) {
        const epoch = this.epoch;
        const versions = entries.map(entry => entry.version);
        entries.forEach(entry => { entry.state = 'loading'; });
        const controller = new AbortController();
        this.controllers.add(controller);
        this.load(entries.map(entry => entry.id), entries[0].filters, controller.signal)
            .then(data => this.complete(entries, versions, epoch, data))
            .catch(() => this.complete(entries, versions, epoch))
            .finally(() => this.controllers.delete(controller));
    }

    private complete(entries: Entry[], versions: number[], epoch: number, data?: Record<string, ProductPreview[]>) {
        if (!this.active || this.epoch !== epoch) return;
        entries.forEach((entry, index) => {
            if (entry.version !== versions[index] || this.entries.get(`${entry.group}:${entry.id}`) !== entry) return;
            entry.state = 'done';
            entry.data = data?.[entry.id];
            entry.listeners.forEach(notify => notify());
        });
    }
}
