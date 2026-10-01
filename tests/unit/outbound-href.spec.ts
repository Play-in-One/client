import { test, expect } from '@playwright/test';
import { outboundHref } from '../../src/lib/outbound';

test('outbound href carries only attribution fields, never destination or visitor IDs', () => {
    expect(outboundHref('product', 42, { utm_source: 'tiktok', utm_medium: 'paid', utm_campaign: 'launch', click: 'ttclid' }))
        .toBe('/go/product/42?attr_utm_source=tiktok&attr_utm_medium=paid&attr_utm_campaign=launch&attr_click=ttclid');
    expect(outboundHref('store', 5, {})).toBe('/go/store/5');
});
