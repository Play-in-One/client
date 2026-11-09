import { test, expect } from '@playwright/test';
import { pageWindow } from '../../src/components/CrawlablePagination';

/* La misma ventana que el `Pagination` de Mantine en /search: siete huecos. */
test('pocas páginas: todas', () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

test('muchas páginas: las primeras, el medio o las últimas, con elipsis', () => {
    expect(pageWindow(1, 384)).toEqual([1, 2, 3, 4, 5, 'gap', 384]);
    expect(pageWindow(4, 384)).toEqual([1, 2, 3, 4, 5, 'gap', 384]);
    expect(pageWindow(10, 384)).toEqual([1, 'gap', 9, 10, 11, 'gap', 384]);
    expect(pageWindow(381, 384)).toEqual([1, 'gap', 380, 381, 382, 383, 384]);
    expect(pageWindow(384, 384)).toEqual([1, 'gap', 380, 381, 382, 383, 384]);
});
