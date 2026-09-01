import { test, expect } from '@playwright/test';

/* Reproduce el bug con red lenta: sin throttling la ventana del flash es tan
   corta que un test podría no verla y dar un falso OK. */
const OFF = { name: 'pio_prefs', value: '{"condition":"all","international":false}', path: '/', domain: 'localhost' };

for (const path of ['/game/1', '/', '/saved']) {
    test(`sin flash en ${path}`, async ({ page, context }) => {
        test.setTimeout(120_000);
        await context.addCookies([OFF]);
        const client = await context.newCDPSession(page);
        await client.send('Network.emulateNetworkConditions', {
            offline: false, latency: 300, downloadThroughput: 3_000_000 / 8, uploadThroughput: 1_000_000 / 8,
        });

        // Vigila desde el primer instante: si la marca de tienda internacional
        // llega a estar VISIBLE alguna vez, queda registrado.
        await page.addInitScript(() => {
            (window as any).__seen = 0;
            const check = () => {
                for (const el of document.querySelectorAll('[aria-label="Tienda internacional"]')) {
                    const r = (el as HTMLElement).getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) (window as any).__seen++;
                }
            };
            const start = () => { check(); new MutationObserver(check).observe(document.body, { childList: true, subtree: true }); };
            if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
        });

        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        expect(await page.evaluate(() => (window as any).__seen)).toBe(0);
    });
}
