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

/* `headers()` de un Server Component nunca ve `rsc` ni `next-router-*`: Next
 * las borra antes del render. La marca la pone el middleware —su matcher sí
 * las ve— para que el layout de la ficha sepa que no hace falta esperar al
 * backend para decidir el status. */
test('current RSC navigation is marked for the server render', () => {
    const response = middleware(new NextRequest('https://pio.test/juego/zelda-1', {
        headers: { 'x-deployment-id': 'current-release' },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-request-x-pio-rsc')).toBe('1');
    expect(response.headers.get('x-middleware-override-headers')?.split(',')).toContain('x-pio-rsc');
});

test('the reload response is not marked', () => {
    const response = middleware(new NextRequest('https://pio.test/juego/zelda-1', {
        headers: { 'x-deployment-id': 'previous-release' },
    }));
    expect(response.status).toBe(409);
    expect(response.headers.get('x-middleware-request-x-pio-rsc')).toBeNull();
});
