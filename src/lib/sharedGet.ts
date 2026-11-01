/** Deduplicate only concurrent public browser GETs, never persisted responses. */
type Pending = { controller: AbortController; promise: Promise<Response>; users: number };

export class SharedGet {
    private pending = new Map<string, Pending>();
    constructor(private transport: typeof fetch = fetch) {}

    request(url: string, init: RequestInit = {}): Promise<Response> {
        if (init.signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
        const headers = [...new Headers(init.headers).entries()].sort(([a], [b]) => a.localeCompare(b));
        const key = JSON.stringify([url, headers, init.credentials, init.cache]);
        let entry = this.pending.get(key);
        if (!entry) {
            const controller = new AbortController();
            // Native browser fetch rejects a SharedGet instance as its receiver.
            const transport = this.transport;
            entry = { controller, users: 0, promise: transport(url, { ...init, signal: controller.signal }) };
            this.pending.set(key, entry);
            const current = entry;
            const cleanup = () => { if (this.pending.get(key) === current) this.pending.delete(key); };
            entry.promise.then(cleanup, cleanup);
        }
        const current = entry;
        current.users++;
        return new Promise((resolve, reject) => {
            let done = false;
            const release = () => {
                done = true;
                init.signal?.removeEventListener('abort', abort);
                current.users--;
            };
            const abort = () => {
                if (done) return;
                release();
                reject(new DOMException('Aborted', 'AbortError'));
                if (!current.users) {
                    if (this.pending.get(key) === current) this.pending.delete(key);
                    current.controller.abort();
                }
            };
            init.signal?.addEventListener('abort', abort, { once: true });
            current.promise.then(response => {
                if (done) return;
                release();
                resolve(response.clone());
            }, error => {
                if (done) return;
                release();
                reject(error);
            });
        });
    }
}

export const publicBrowserGet = new SharedGet();
