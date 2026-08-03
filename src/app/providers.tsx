'use client';

import { MantineProvider } from '@mantine/core';
import { theme } from '@/theme';
import { cssVariablesResolver } from '@/theme.cssVariables';
import { AdminProvider } from '@/context/AdminContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">
            <AdminProvider>{children}</AdminProvider>
        </MantineProvider>
    );
}
