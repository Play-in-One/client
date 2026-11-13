import { test, expect } from '@playwright/test';
import { shouldUpgradeCover } from '../../src/lib/hiRes';

test('upgrades a real cover on a normal connection', () => {
    expect(shouldUpgradeCover('https://cdn.example.com/cover.jpg')).toBe(true);
    expect(shouldUpgradeCover('https://cdn.example.com/cover.jpg', { effectiveType: '4g' })).toBe(true);
    expect(shouldUpgradeCover('https://cdn.example.com/cover.jpg', {})).toBe(true);
});

test('does not upgrade without a real cover', () => {
    expect(shouldUpgradeCover(null)).toBe(false);
    expect(shouldUpgradeCover('')).toBe(false);
    expect(shouldUpgradeCover('/placeholder-game.png')).toBe(false);
});

test('respects data saver and slow connections', () => {
    const src = 'https://cdn.example.com/cover.jpg';
    expect(shouldUpgradeCover(src, { saveData: true })).toBe(false);
    expect(shouldUpgradeCover(src, { effectiveType: '2g' })).toBe(false);
    expect(shouldUpgradeCover(src, { effectiveType: 'slow-2g' })).toBe(false);
    expect(shouldUpgradeCover(src, { effectiveType: '3g' })).toBe(true);
});
