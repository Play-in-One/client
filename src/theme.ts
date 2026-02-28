'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';

/* Paleta "Signature Red" de los prototipos */
const primaryRed: MantineColorsTuple = [
    '#ffeaec',
    '#fdd4d7',
    '#f5a7ad',
    '#ee777f',
    '#e84f59',
    '#e53742',  // primary (idx 5)
    '#e42a36',
    '#ca1d28',
    '#b51523',
    '#9f041b',
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
