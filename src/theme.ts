'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';

/* Paleta "Signature Red" de los prototipos */
const primaryRed: MantineColorsTuple = [
    '#ffe4ed',
    '#ffc8d9',
    '#fa9ab6',
    '#f66891',
    '#f34173',
    '#f02f68',  // primary (idx 5)
    '#d8235a',
    '#be1b4d',
    '#a41641',
    '#8c0f33',
];

export const theme = createTheme({
    primaryColor: 'primaryRed',
    colors: { primaryRed },
    fontFamily: 'Poppins, Inter, system-ui, sans-serif',
    headings: { fontFamily: 'Poppins, Inter, system-ui, sans-serif' },
    defaultRadius: 'md',
    cursorType: 'pointer',
    other: {
        surfaceLight: '#FFFFFF',
        surfaceDark: '#1E1E1E',
        bgLight: '#F8F9FA',
        bgDark: '#121212',
    },
});
