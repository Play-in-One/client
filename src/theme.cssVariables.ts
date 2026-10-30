import type { CSSVariablesResolver } from '@mantine/core';
import { brandText, elevation, foregrounds, lightVariantText, onDark, surfaces } from '@/lib/colors';

const lightVariantVars = Object.fromEntries(
    Object.entries(lightVariantText).map(([color, value]) => [`--mantine-color-${color}-light-color`, value]),
);

export const cssVariablesResolver: CSSVariablesResolver = () => ({
    variables: {
        '--pio-condition-indicator': surfaces.conditionIndicator,
        '--pio-condition-glow': surfaces.conditionGlow,
        '--pio-on-dark-text': onDark.text,
        '--pio-on-dark-label': onDark.textLabel,
        '--pio-on-dark-border-strong': onDark.borderStrong,
        '--pio-shadow-hover': elevation.hover,
    },
    light: {
        '--pio-navbar-bg': surfaces.light.navbar,
        '--pio-condition-switch-bg': surfaces.light.conditionSwitchTrack,
        '--pio-scrollbar-thumb': surfaces.light.scrollbarThumb,
        '--pio-skeleton-shine': surfaces.light.skeletonShine,
        '--mantine-color-black': foregrounds.light.primary,
        '--mantine-color-dimmed': foregrounds.light.dimmed,
        '--pio-brand-text': brandText.light,
        ...lightVariantVars,
        /* `c="success"` y `c="danger"`: Mantine usa el tono 6, que daba 2,36:1 y
           3,28:1 sobre blanco. Mismo tono que su variante `light`. */
        '--mantine-color-success-text': lightVariantText.success,
        '--mantine-color-danger-text': lightVariantText.danger,
        '--mantine-color-body': surfaces.light.body,
    },
    dark: {
        '--pio-navbar-bg': surfaces.dark.navbar,
        '--pio-condition-switch-bg': surfaces.dark.conditionSwitchTrack,
        '--pio-scrollbar-thumb': surfaces.dark.scrollbarThumb,
        '--pio-skeleton-shine': surfaces.dark.skeletonShine,
        '--mantine-color-dimmed': foregrounds.dark.dimmed,
        '--pio-brand-text': brandText.dark,
        '--mantine-color-body': surfaces.dark.body,
    },
});
