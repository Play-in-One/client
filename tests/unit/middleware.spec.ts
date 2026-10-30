import { expect, test } from '@playwright/test';
import { NextRequest } from 'next/server';
import { middleware } from '../../src/middleware';

const deployment = process.env.NEXT_DEPLOYMENT_ID;
test.beforeEach(() => { process.env.NEXT_DEPLOYMENT_ID = 'current-release'; });
test.afterEach(() => {
    if (deployment === undefined) delete process.env.NEXT_DEPLOYMENT_ID;
    else process.env.NEXT_DEPLOYMENT_ID = deployment;
});

test('outdated RSC navigation still receives the reload response', () => {
    const response = middleware(new NextRequest('https://pio.test/search', {
        headers: { 'x-deployment-id': 'previous-release' },
    }));
    expect(response.status).toBe(409);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('current RSC navigation remains available', () => {
    expect(middleware(new NextRequest('https://pio.test/search', {
        headers: { 'x-deployment-id': 'current-release' },
    })).status).toBe(200);
});

test('RSC navigation without a deployment ID receives the reload response', () => {
    // Next has already removed the RSC header when this function runs.
    expect(middleware(new NextRequest('https://pio.test/about')).status).toBe(409);
});
