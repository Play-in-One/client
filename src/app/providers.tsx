'use client';

import { MantineProvider } from '@mantine/core';
import { theme } from '@/theme';
import { cssVariablesResolver } from '@/theme.cssVariables';
import { AdminProvider } from '@/context/AdminContext';
import { ConsentProvider } from '@/context/ConsentContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">
            {/* ConsentProvider envuelve a todo lo que mide: al montar decide si
                trackEvent() puede enviar algo y con qué identidad, así que debe
                estar por fuera de cualquier componente que dispare eventos. */}
            <ConsentProvider>
                <AdminProvider>{children}</AdminProvider>
            </ConsentProvider>
        </MantineProvider>
    );
}
