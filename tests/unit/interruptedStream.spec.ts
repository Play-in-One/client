import { test, expect } from '@playwright/test';
import { ASSET_FAILED_KEY, assetFailedRecently, isInterruptedStream } from '../../src/lib/interruptedStream';

test('reconoce el corte de la respuesta en React y en cada navegador', () => {
    for (const message of ['Connection closed.', 'Error in input stream', 'network error', 'Failed to fetch',
        'Load failed', 'The network connection was lost.']) {
        expect(isInterruptedStream(new TypeError(message)), message).toBe(true);
    }
});

test('un chunk que no cargó también es una carga cortada', () => {
    const chunk = new Error('Loading chunk 3465 failed.\n(error: http://localhost/_next/static/chunks/3465.js)');
    expect(isInterruptedStream(chunk)).toBe(true);
    expect(isInterruptedStream(new Error('Loading CSS chunk 12 failed.'))).toBe(true);
    const named = new Error('cualquier texto');
    named.name = 'ChunkLoadError';
    expect(isInterruptedStream(named)).toBe(true);
});

test('un error de la aplicación no se confunde con un corte', () => {
    expect(isInterruptedStream(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isInterruptedStream(new Error('Minified React error #130'))).toBe(false);
    expect(isInterruptedStream(undefined)).toBe(false);
});

test('un archivo de la app que falló hace poco explica el error de render', () => {
    const now = 1_000_000;
    expect(assetFailedRecently(now, { [ASSET_FAILED_KEY]: now - 2_000 })).toBe(true);
    expect(assetFailedRecently(now, { [ASSET_FAILED_KEY]: now - 60_000 })).toBe(false);
    expect(assetFailedRecently(now, {})).toBe(false);
    expect(assetFailedRecently(now, undefined)).toBe(false);
});
