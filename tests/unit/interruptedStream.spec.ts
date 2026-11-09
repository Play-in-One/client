import { test, expect } from '@playwright/test';
import { isInterruptedStream } from '../../src/lib/interruptedStream';

test('reconoce el corte de la respuesta en React y en cada navegador', () => {
    for (const message of ['Connection closed.', 'Error in input stream', 'network error', 'Failed to fetch',
        'Load failed', 'The network connection was lost.']) {
        expect(isInterruptedStream(new TypeError(message)), message).toBe(true);
    }
});

test('un error de la aplicación no se confunde con un corte', () => {
    expect(isInterruptedStream(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isInterruptedStream(undefined)).toBe(false);
});
