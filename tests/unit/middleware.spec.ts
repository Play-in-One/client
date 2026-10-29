import { expect, test } from '@playwright/test';
import { NextRequest } from 'next/server';
import { middleware } from '../../src/middleware';
import { CONSOLES_ENABLED } from '../../src/lib/features';

const deployment = process.env.NEXT_DEPLOYMENT_ID;
test.beforeEach(() => { process.env.NEXT_DEPLOYMENT_ID = 'current-release'; });
test.afterEach(() => {
    if (deployment === undefined) delete process.env.NEXT_DEPLOYMENT_ID;
    else process.env.NEXT_DEPLOYMENT_ID = deployment;
});

test('ordinary game searches remain available with a deployment ID configured', () => {
    expect(middleware(new NextRequest('https://pio.test/search?q=Zelda')).status).toBe(200);
});

test('outdated RSC navigation still receives the reload response', () => {
    const response = middleware(new NextRequest('https://pio.test/search', {
        headers: { rsc: '1', 'x-deployment-id': 'previous-release' },
    }));
    expect(response.status).toBe(409);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('current RSC navigation remains available', () => {
    expect(middleware(new NextRequest('https://pio.test/search', {
        headers: { rsc: '1', 'x-deployment-id': 'current-release' },
    })).status).toBe(200);
});

test('hidden console searches return to game search without hardware filters', () => {
    test.skip(CONSOLES_ENABLED, 'La categoría de consolas está habilitada.');
    const response = middleware(new NextRequest('https://pio.test/search?category=console&search=PS5&storage_gb=1000'));
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://pio.test/search?q=PS5');
});
