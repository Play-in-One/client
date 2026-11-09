import { test, expect } from '@playwright/test';

const platform = { id: 1, name: 'ps5', slug: 'ps5', display_name: 'PS5', long_name: 'PlayStation 5', family: 'playstation', order: 1 };
const results = (name: string) => ({ count: 1, next: null, previous: null, results: [{
    id: 999001, name, slug: 'test', image: null, platforms: [platform], genres: [], min_price: '1000',
}] });

test('a search submitted before JavaScript is ready carries its text to the results URL', async ({ page }) => {
    const scripts = '**/_next/static/**/*.js';
    await page.route(scripts, route => route.abort());
    await page.route(/\/api\/games\/(\?|$)/, route => route.fulfill({ json: results('zelda') }));
    await page.goto('/search');
    const input = page.locator('main input[placeholder="Buscar juegos..."]');
    await input.fill('zelda');
    await page.unroute(scripts);
    await input.press('Enter');
    await expect(page).toHaveURL(/q=zelda/);
    await expect(page.getByRole('heading', { name: 'Resultados para "zelda"' })).toBeVisible();
});

for (const [path, selector] of [
    ['/search', 'main input[placeholder="Buscar juegos..."]'],
    ['/', 'main input[placeholder^="Ej:"]'],
]) {
    test(`text entered before hydration survives and is submitted from ${path}`, async ({ page }) => {
        let resume!: () => void;
        const scripts = new Promise<void>(resolve => { resume = resolve; });
        await page.route('**/_next/static/**/*.js', async route => {
            await scripts;
            await route.continue();
        });
        await page.route(/\/api\/games\/(\?|$)/, route => route.fulfill({ json: results('zelda') }));
        try {
            await page.goto(path, { waitUntil: 'commit' });
            const input = page.locator(selector);
            await input.fill('zelda');
            resume();
            await page.waitForFunction(selector => {
                const input = document.querySelector(selector);
                return input && Object.keys(input).some(key => key.startsWith('__reactProps'));
            }, selector);
            await expect(input).toHaveValue('zelda');
            await input.press('Enter');
            await expect(page).toHaveURL(/q=zelda/);
        } finally { resume(); }
    });
}

test('writing while facets resolve preserves the draft and does not request results until submit', async ({ page }) => {
    const queries: string[] = [];
    let finishFacets: (() => Promise<void>) | undefined;
    await page.route(/\/api\/platforms\//, route => route.fulfill({ json: { results: [platform] } }));
    await page.route(/\/api\/genres\//, route => route.fulfill({ json: { results: [{ id: 1, name: 'Aventura' }] } }));
    await page.route(/\/api\/games\/(\?|$)/, route => {
        const q = new URL(route.request().url()).searchParams.get('search') ?? '';
        queries.push(q);
        return route.fulfill({ json: results(q) });
    });
    await page.route(/\/api\/games\/facets\//, route => {
        finishFacets = () => route.fulfill({ json: { platforms: { 1: 1 }, genres: { 1: 1 } } });
    });
    await page.goto('/search?q=initial');
    await expect(page.getByRole('heading', { name: 'Resultados para "initial"' })).toBeVisible();
    const input = page.locator('main').getByRole('textbox', { name: 'Buscar juegos...' });
    await expect.poll(() => queries.length).toBe(1);
    await input.fill('zel');
    await expect.poll(() => !!finishFacets).toBe(true);
    await finishFacets!();
    await input.pressSequentially('da', { delay: 30 });
    await expect(input).toHaveValue('zelda');
    expect(queries).toEqual(['initial']);
    await input.press('Enter');
    await expect(page).toHaveURL(/q=zelda/);
    await expect(page.getByRole('heading', { name: 'Resultados para "zelda"' })).toBeVisible();
    await expect.poll(() => queries.filter(q => q === 'zelda').length).toBe(1);
});

test('a direct search visit does not request surveys or staff previews', async ({ page }) => {
    const unnecessary: string[] = [];
    page.on('request', request => {
        if (/\/api\/(surveys|games\/product-previews)\//.test(request.url())) unnecessary.push(request.url());
    });
    await page.goto('/search');
    const input = page.locator('main').getByRole('textbox', { name: 'Buscar juegos...' });
    await input.fill('temporary');
    await expect(input).toHaveValue('temporary');
    await page.waitForTimeout(2000);
    expect(unnecessary).toEqual([]);
});
