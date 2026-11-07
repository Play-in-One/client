import { test, expect } from '@playwright/test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MantineProvider } from '@mantine/core';
import type { Game } from '../../src/lib/types';

// Match postBody.spec.ts: render real React JSX, not Playwright component descriptors.
// eslint-disable-next-line @typescript-eslint/no-require-imports
Object.assign(require('playwright/jsx-runtime'), require('react/jsx-runtime'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FeaturedGamesCarousel: ComponentType<{ games: Game[] }> = require('../../src/components/FeaturedGamesCarousel').default;

for (const count of [0, 1, 2, 6]) {
    test(`carousel SSR renders ${count} originals without clones or an opaque skeleton`, () => {
        const games = Array.from({ length: count }, (_, id) => ({
            id: id + 1, name: `Game ${id}`, slug: `game-${id}`, platforms: [], genres: [],
            image: null, min_price: null, rating: null,
        } as unknown as Game));
        const html = renderToStaticMarkup(createElement(MantineProvider, {},
            createElement(FeaturedGamesCarousel, { games })));
        expect([...html.matchAll(/class="[^"]*\bmantine-Carousel-slide\b/g)]).toHaveLength(count);
        expect(html).not.toContain('mantine-Skeleton-root');
    });
}
