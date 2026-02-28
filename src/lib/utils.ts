/** Utility: format Chilean peso */
export function formatCLP(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
}

/** Compute discount percentage between two prices */
export function discountPercent(original: number | string, current: number | string): number {
    const orig = typeof original === 'string' ? parseFloat(original) : original;
    const cur = typeof current === 'string' ? parseFloat(current) : current;
    if (orig <= 0) return 0;
    return Math.round(((orig - cur) / orig) * 100);
}

/** Color map for platform badges */
export const platformColors: Record<string, string> = {
    ps5: '#2563EB',
    ps4: '#1E40AF',
    xbox: '#16A34A',
    switch: '#DC2626',
    switch2: '#EF4444',
    pc: '#6B7280',
};

/** Platform icon names (Material Icons Round) */
export const platformIcons: Record<string, string> = {
    ps5: 'gamepad',
    ps4: 'gamepad',
    xbox: 'sports_esports',
    switch: 'videogame_asset',
    switch2: 'videogame_asset',
    pc: 'desktop_windows',
};
