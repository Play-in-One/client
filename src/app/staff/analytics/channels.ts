import { chart } from '@/lib/colors';
import type { TrafficChannel } from '@/lib/types';

/* Grupos de canales para el gráfico diario. El detalle por canal va en la
   tabla; el gráfico solo necesita la forma grande: buscadores, anuncios, redes,
   asistentes IA, directo y el resto. */

export type ChannelGroup = 'search' | 'paid' | 'social' | 'ai' | 'direct' | 'other' | 'unknown';

/** En el orden en que se apilan y se asignan los colores. */
export const CHANNEL_GROUPS: { key: ChannelGroup; label: string }[] = [
    { key: 'search', label: 'Buscadores' },
    { key: 'paid', label: 'Anuncios' },
    { key: 'social', label: 'Redes sociales' },
    { key: 'ai', label: 'Asistentes IA' },
    { key: 'direct', label: 'Directo' },
    { key: 'other', label: 'Otros sitios' },
    { key: 'unknown', label: 'Sin dato' },
];

export const CHANNEL_GROUP_COLORS: Record<ChannelGroup, { light: string; dark: string }> = {
    ...chart.channels,
    ai: { light: chart.series.violet, dark: chart.series.purple },
};

const GROUP_OF: Record<TrafficChannel, ChannelGroup> = {
    google_organic: 'search',
    search_other: 'search',
    google_ads: 'paid',
    meta_ads: 'paid',
    tiktok_ads: 'paid',
    other_paid: 'paid',
    instagram: 'social',
    facebook: 'social',
    tiktok: 'social',
    youtube: 'social',
    x: 'social',
    whatsapp: 'social',
    direct: 'direct',
    ai: 'ai',
    email: 'other',
    referral: 'other',
    '': 'unknown',
};

export function channelGroup(channel: TrafficChannel): ChannelGroup {
    return GROUP_OF[channel] ?? 'other';
}

/** Etiqueta de un canal cuando la API no la trae (filas de orígenes y campañas). */
export const CHANNEL_LABELS: Record<TrafficChannel, string> = {
    google_ads: 'Anuncios Google',
    meta_ads: 'Anuncios Meta',
    tiktok_ads: 'Anuncios TikTok',
    other_paid: 'Otros anuncios',
    google_organic: 'Google orgánico',
    search_other: 'Otros buscadores',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    x: 'X',
    whatsapp: 'WhatsApp',
    ai: 'Asistentes IA',
    email: 'Correo',
    referral: 'Otros sitios',
    direct: 'Directo',
    '': 'Sin dato',
};
