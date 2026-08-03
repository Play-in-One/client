import type { CSSVariablesResolver } from '@mantine/core';
import { surfaces } from '@/lib/colors';

export const cssVariablesResolver: CSSVariablesResolver = () => ({
    variables: {
        '--pio-condition-indicator': surfaces.conditionIndicator,
        '--pio-condition-glow': surfaces.conditionGlow,
    },
    light: {
        '--pio-navbar-bg': surfaces.light.navbar,
        '--pio-condition-switch-bg': surfaces.light.conditionSwitchTrack,
        '--mantine-color-body': surfaces.light.body,
    },
    dark: {
        '--pio-navbar-bg': surfaces.dark.navbar,
        '--pio-condition-switch-bg': surfaces.dark.conditionSwitchTrack,
        '--mantine-color-body': surfaces.dark.body,
    },
});
