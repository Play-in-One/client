'use client';

import { createTheme } from '@mantine/core';
import { brand, darkScale } from '@/lib/colors';

export const theme = createTheme({
    primaryColor: 'primaryRed',
    colors: { primaryRed: brand.primaryScale, dark: darkScale },
    fontFamily: 'var(--font-poppins), Inter, system-ui, sans-serif',
    headings: { fontFamily: 'var(--font-poppins), Inter, system-ui, sans-serif' },
    defaultRadius: 'md',
    cursorType: 'pointer',
});
