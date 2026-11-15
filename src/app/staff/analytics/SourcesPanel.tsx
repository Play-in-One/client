'use client';

import { Fragment, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Accordion,
    Alert,
    Badge,
    Box,
    Button,
    Group,
    NativeSelect,
    Progress,
    SegmentedControl,
    SimpleGrid,
    Stack,
    Table,
    Text,
    UnstyledButton,
    useComputedColorScheme,
} from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

import type {
    CampaignStat,
    SourceMetrics,
    SourcesReport,
    SourceStat,
    TrafficChannel,
} from '@/lib/types';
import { CHANNEL_GROUPS, CHANNEL_GROUP_COLORS, CHANNEL_LABELS, channelGroup, type ChannelGroup } from './channels';

const SourcesChart = dynamic(() => import('./charts').then((m) => m.SourcesChart), { ssr: false });

export interface NormalizedPlatform {
    key: string;
    label: string;
    isSocial?: boolean;
    isAi?: boolean;
}

const PAID_MEDIUMS = new Set([
    'cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'paid-social',
    'ads', 'ad', 'cpm', 'display', 'banner', 'sponsored',
]);

const SUBDOMAIN_PREFIX_RE = /^(?:www|m|l|lm|mobile|cl\.search|search|out|old|cl|es|ar|mx)\./;
const TLD_SUFFIX_RE = /\.(?:com\.ar|com\.mx|co\.uk|com|cl|net|org|io|ai|co|gg|tv|me|app)$/;
const ANDROID_PKG_RE = /^(?:com|org|net|io)\.([a-z0-9_-]+)(?:\.|$)/;

/**
 * Normaliza un dominio, subdominio, acortador, paquete Android o alias UTM
 * a un identificador y nombre legible de plataforma (sin `.com` ni ruido).
 */
export function normalizePlatform(rawSource: string): NormalizedPlatform {
    const s = rawSource.trim().toLowerCase();
    if (!s) return { key: 'unknown', label: 'Sin origen' };

    if (s === 'reddit' || s === 'redd.it' || s === 'reddit.com' || s.endsWith('.reddit.com') || s.includes('reddit')) {
        return { key: 'reddit', label: 'Reddit', isSocial: true };
    }
    if (s === 'instagram' || s === 'ig' || s === 'instagram.com' || s.endsWith('.instagram.com')) {
        return { key: 'instagram', label: 'Instagram', isSocial: true };
    }
    if (
        s === 'facebook' || s === 'fb' || s === 'meta'
        || s === 'facebook.com' || s.endsWith('.facebook.com')
        || s === 'fb.com' || s === 'fb.me'
        || s === 'messenger.com' || s.endsWith('.messenger.com')
    ) {
        return { key: 'facebook', label: 'Facebook', isSocial: true };
    }
    if (s === 'tiktok' || s === 'tt' || s === 'tiktok.com' || s.endsWith('.tiktok.com')) {
        return { key: 'tiktok', label: 'TikTok', isSocial: true };
    }
    if (s === 'youtube' || s === 'yt' || s === 'youtu.be' || s === 'youtube.com' || s.endsWith('.youtube.com')) {
        return { key: 'youtube', label: 'YouTube', isSocial: true };
    }
    if (s === 'x' || s === 'twitter' || s === 't.co' || s === 'x.com' || s === 'twitter.com' || s.endsWith('.twitter.com')) {
        return { key: 'x', label: 'X', isSocial: true };
    }
    if (s === 'whatsapp' || s === 'wa' || s === 'wa.me' || s === 'whatsapp.com' || s.endsWith('.whatsapp.com')) {
        return { key: 'whatsapp', label: 'WhatsApp', isSocial: true };
    }
    if (s === 'discord' || s === 'discord.com' || s.endsWith('.discord.com') || s === 'discord.gg' || s === 'discordapp.com') {
        return { key: 'discord', label: 'Discord', isSocial: true };
    }
    if (s === 'twitch' || s === 'twitch.tv' || s.endsWith('.twitch.tv')) {
        return { key: 'twitch', label: 'Twitch', isSocial: true };
    }
    if (s === 'threads' || s === 'threads.net' || s.endsWith('.threads.net')) {
        return { key: 'threads', label: 'Threads', isSocial: true };
    }
    if (s === 'telegram' || s === 't.me' || s === 'telegram.org' || s.endsWith('.telegram.org')) {
        return { key: 'telegram', label: 'Telegram', isSocial: true };
    }
    if (s === 'pinterest' || s === 'pin.it' || s.startsWith('pinterest.') || s.includes('.pinterest.')) {
        return { key: 'pinterest', label: 'Pinterest', isSocial: true };
    }
    if (s === 'linkedin' || s === 'lnkd.in' || s === 'linkedin.com' || s.endsWith('.linkedin.com')) {
        return { key: 'linkedin', label: 'LinkedIn', isSocial: true };
    }
    if (s === 'bluesky' || s === 'bsky' || s === 'bsky.app' || s.endsWith('.bsky.app')) {
        return { key: 'bluesky', label: 'Bluesky', isSocial: true };
    }
    if (s === 'mastodon' || s === 'mastodon.social' || s.endsWith('.mastodon.social')) {
        return { key: 'mastodon', label: 'Mastodon', isSocial: true };
    }
    if (
        s === 'chatgpt' || s === 'openai'
        || s === 'chatgpt.com' || s.endsWith('.chatgpt.com')
        || s === 'openai.com' || s.endsWith('.openai.com')
    ) {
        return { key: 'chatgpt', label: 'ChatGPT', isAi: true };
    }
    if (s === 'claude' || s === 'claude.ai' || s.endsWith('.claude.ai')) {
        return { key: 'claude', label: 'Claude', isAi: true };
    }
    if (s === 'gemini' || s === 'gemini.google.com' || s === 'bard.google.com') {
        return { key: 'gemini', label: 'Gemini', isAi: true };
    }
    if (s === 'perplexity' || s === 'perplexity.ai' || s.endsWith('.perplexity.ai')) {
        return { key: 'perplexity', label: 'Perplexity', isAi: true };
    }
    if (s === 'copilot' || s === 'copilot.microsoft.com' || s === 'bing.com/chat') {
        return { key: 'copilot', label: 'Copilot', isAi: true };
    }
    if (s === 'deepseek' || s === 'deepseek.com' || s.endsWith('.deepseek.com')) {
        return { key: 'deepseek', label: 'DeepSeek', isAi: true };
    }
    if (s === 'grok' || s === 'grok.com' || s.endsWith('.grok.com') || s === 'x.ai') {
        return { key: 'grok', label: 'Grok', isAi: true };
    }
    if (s === 'mistral' || s === 'mistral.ai' || s.endsWith('.mistral.ai')) {
        return { key: 'mistral', label: 'Mistral', isAi: true };
    }
    if (s === 'poe' || s === 'poe.com' || s.endsWith('.poe.com')) {
        return { key: 'poe', label: 'Poe', isAi: true };
    }
    if (s === 'you' || s === 'you.com' || s.endsWith('.you.com')) {
        return { key: 'you', label: 'You.com', isAi: true };
    }
    if (s === 'google' || s === 'adwords' || s === 'googleads' || s.startsWith('google.') || s.includes('.google.')) {
        return { key: 'google', label: 'Google' };
    }
    if (s === 'bing' || s === 'bing.com' || s.endsWith('.bing.com')) {
        return { key: 'bing', label: 'Bing' };
    }
    if (s === 'duckduckgo' || s === 'ddg' || s === 'duckduckgo.com' || s.endsWith('.duckduckgo.com')) {
        return { key: 'duckduckgo', label: 'DuckDuckGo' };
    }
    if (s === 'yahoo' || s === 'yahoo.com' || s.endsWith('.yahoo.com')) {
        return { key: 'yahoo', label: 'Yahoo' };
    }
    if (s === 'ecosia' || s === 'ecosia.org') {
        return { key: 'ecosia', label: 'Ecosia' };
    }
    if (s === 'brave' || s === 'search.brave.com') {
        return { key: 'brave', label: 'Brave Search' };
    }
    if (s === 'capa9' || s === 'capa9.net' || s.endsWith('.capa9.net')) {
        return { key: 'capa9', label: 'Capa9' };
    }

    const pkgMatch = s.match(ANDROID_PKG_RE);
    let clean = pkgMatch ? pkgMatch[1] : s.replace(SUBDOMAIN_PREFIX_RE, '').replace(TLD_SUFFIX_RE, '');
    if (!clean) clean = s;
    const label = clean.charAt(0).toUpperCase() + clean.slice(1);
    return { key: clean, label };
}

function exits(row: { offer_clicks: number; store_clicks: number }): number {
    return row.offer_clicks + row.store_clicks;
}

function percent(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;
}

function count(value: number | null | undefined): string {
    return value == null ? '—' : value.toLocaleString('es-CL');
}

function FunnelCells({ row }: { row: SourceMetrics }) {
    return (
        <>
            <Table.Td ta="right" fw={600}>{count(row.sessions)}</Table.Td>
            <Table.Td ta="right">{count(row.sessions_with_game_view)}</Table.Td>
            <Table.Td ta="right">{count(row.sessions_with_exit)}</Table.Td>
            <Table.Td ta="right">{count(exits(row))}</Table.Td>
            <Table.Td ta="right" c="dimmed">{percent(row.session_exit_rate)}</Table.Td>
        </>
    );
}

function sumMetrics(rows: SourceMetrics[]): SourceMetrics {
    let sessions = 0;
    let pageViews = 0;
    let gameViews = 0;
    let offerClicks = 0;
    let storeClicks = 0;
    let sessionsWithGameView = 0;
    let sessionsWithExit = 0;
    const funnelComplete = rows.length > 0 && rows.every((c) => c.funnel_complete);

    for (const row of rows) {
        sessions += row.sessions;
        pageViews += row.page_views;
        gameViews += row.game_views;
        offerClicks += row.offer_clicks;
        storeClicks += row.store_clicks;
        if (funnelComplete) {
            sessionsWithGameView += row.sessions_with_game_view ?? 0;
            sessionsWithExit += row.sessions_with_exit ?? 0;
        }
    }

    const totalExits = offerClicks + storeClicks;
    return {
        sessions,
        page_views: pageViews,
        game_views: gameViews,
        offer_clicks: offerClicks,
        store_clicks: storeClicks,
        conversion_rate: sessions ? Math.round((totalExits / sessions) * 1000) / 10 : 0,
        sessions_with_game_view: funnelComplete ? sessionsWithGameView : null,
        sessions_with_exit: funnelComplete ? sessionsWithExit : null,
        session_game_view_rate: funnelComplete
            ? (sessions ? Math.round((sessionsWithGameView / sessions) * 1000) / 10 : 0)
            : null,
        session_exit_rate: funnelComplete
            ? (sessions ? Math.round((sessionsWithExit / sessions) * 1000) / 10 : 0)
            : null,
        funnel_complete: funnelComplete,
    };
}

function subtractMetrics(total: SourceMetrics, parts: SourceMetrics[]): SourceMetrics {
    const sub = sumMetrics(parts);
    const sessions = Math.max(0, total.sessions - sub.sessions);
    const pageViews = Math.max(0, total.page_views - sub.page_views);
    const gameViews = Math.max(0, total.game_views - sub.game_views);
    const offerClicks = Math.max(0, total.offer_clicks - sub.offer_clicks);
    const storeClicks = Math.max(0, total.store_clicks - sub.store_clicks);
    const totalExits = offerClicks + storeClicks;
    const funnelComplete = total.funnel_complete && (parts.length === 0 || sub.funnel_complete);
    const sessionsWithGameView = funnelComplete
        ? Math.max(0, (total.sessions_with_game_view ?? 0) - (sub.sessions_with_game_view ?? 0))
        : null;
    const sessionsWithExit = funnelComplete
        ? Math.max(0, (total.sessions_with_exit ?? 0) - (sub.sessions_with_exit ?? 0))
        : null;

    return {
        sessions,
        page_views: pageViews,
        game_views: gameViews,
        offer_clicks: offerClicks,
        store_clicks: storeClicks,
        conversion_rate: sessions ? Math.round((totalExits / sessions) * 1000) / 10 : 0,
        sessions_with_game_view: sessionsWithGameView,
        sessions_with_exit: sessionsWithExit,
        session_game_view_rate: funnelComplete
            ? (sessions ? Math.round(((sessionsWithGameView ?? 0) / sessions) * 1000) / 10 : 0)
            : null,
        session_exit_rate: funnelComplete
            ? (sessions ? Math.round(((sessionsWithExit ?? 0) / sessions) * 1000) / 10 : 0)
            : null,
        funnel_complete: funnelComplete,
    };
}

function effectiveGroup(channelKey: string): ChannelGroup {
    if (channelKey.startsWith('ai:')) return 'ai';
    if (channelKey.startsWith('social:')) return 'social';
    if (channelKey.startsWith('search:')) return 'search';
    if (channelKey.startsWith('other:')) return 'other';
    return channelGroup(channelKey as TrafficChannel);
}

function reclassifiedChannelKey(channel: TrafficChannel, platform: NormalizedPlatform): string {
    if (channel === 'ai' || (channel === 'referral' && platform.isAi)) return `ai:${platform.key}`;
    if (channel === 'referral' && platform.isSocial) return `social:${platform.key}`;
    if (channel === 'search_other') return `search:${platform.key}`;
    if (channel === 'referral') return `other:${platform.key}`;
    return channel || '__unknown__';
}

function channelDisplayLabel(channelKey: string, apiLabel?: string): string {
    if (channelKey === 'google_organic') return 'Google';
    if (
        channelKey.startsWith('ai:')
        || channelKey.startsWith('social:')
        || channelKey.startsWith('search:')
        || channelKey.startsWith('other:')
    ) {
        const key = channelKey.slice(channelKey.indexOf(':') + 1);
        return normalizePlatform(key).label;
    }
    if (apiLabel) return apiLabel;
    return CHANNEL_LABELS[channelKey as TrafficChannel] || 'Sin dato';
}

function isPaidMedium(medium: string, group: ChannelGroup): boolean {
    if (group === 'paid') return true;
    return PAID_MEDIUMS.has(medium.trim().toLowerCase());
}

function MediumBadge({ medium, isPaid }: { medium: string; isPaid: boolean }) {
    if (isPaid) {
        return <Badge size="xs" variant="light" color="orange">Pagado</Badge>;
    }
    const m = medium.trim().toLowerCase();
    if (m === 'social') {
        return <Badge size="xs" variant="light" color="teal">Social</Badge>;
    }
    if (m === 'referral') {
        return <Badge size="xs" variant="light" color="grape">Referral</Badge>;
    }
    if (m === 'organic') {
        return <Badge size="xs" variant="light" color="blue">Orgánico</Badge>;
    }
    if (m) {
        return <Badge size="xs" variant="light" color="gray">{medium}</Badge>;
    }
    return <Badge size="xs" variant="light" color="blue">Orgánico</Badge>;
}

type TrafficFilter = 'all' | 'organic' | 'paid' | 'campaign';
type ViewMode = 'category' | 'platform';
type CampaignMediumFilter = 'all' | 'paid' | 'organic';
type CampaignGroupMode = 'detailed' | 'grouped';

interface EffectiveChannel extends SourceMetrics {
    channelKey: string;
    label: string;
    group: ChannelGroup;
}

interface NormalizedSourceRow extends SourceMetrics {
    platform: NormalizedPlatform;
    rawSources: string[];
}

interface MergedCampaignRow extends SourceMetrics {
    key: string;
    campaign: string;
    platform: NormalizedPlatform;
    channelKey: string;
    channelLabel: string;
    mediums: string[];
    isPaid: boolean;
}

interface GroupedCategory {
    group: { key: ChannelGroup; label: string };
    metrics: SourceMetrics;
    channels: EffectiveChannel[];
}

interface PlatformBreakdownItem extends SourceMetrics {
    key: string;
    channelKey: string;
    channelLabel: string;
    group: ChannelGroup;
    isPaid: boolean;
    rawSources: string[];
    campaigns: MergedCampaignRow[];
}

interface PlatformRow {
    platform: NormalizedPlatform;
    metrics: SourceMetrics;
    items: PlatformBreakdownItem[];
    isPaidMix: 'paid' | 'organic' | 'mixed';
    campaignCount: number;
}

interface GroupedCampaignSummary extends SourceMetrics {
    campaign: string;
    platforms: string[];
    mediums: string[];
    isPaid: boolean;
    hasMixedCost: boolean;
    rowCount: number;
}

/**
 * De dónde llegan las visitas y cuáles terminan en una tienda.
 *
 * Normaliza nombres de plataforma, promueve redes sociales desde `referral`
 * (como Reddit y Pinterest) a «Redes sociales», y ofrece vista por categoría
 * o consolidada por plataforma con filtros de Orgánico / Pagado / Campañas.
 */
export function SourcesPanel({ report }: { report: SourcesReport }) {
    const scheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
    const [collapsedGroups, setCollapsedGroups] = useState<Set<ChannelGroup>>(() => new Set());
    const [expandedChannels, setExpandedChannels] = useState<Set<string>>(() => new Set());
    const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(() => new Set());

    const [trafficFilter, setTrafficFilter] = useState<TrafficFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('category');

    const [campaignMedium, setCampaignMedium] = useState<CampaignMediumFilter>('all');
    const [campaignGroupMode, setCampaignGroupMode] = useState<CampaignGroupMode>('detailed');
    const [selectedCampaign, setSelectedCampaign] = useState<string>('all');

    const total = report.totals.sessions;

    // 1. Reclasifica redes sociales dentro de `referral` (p. ej. Reddit, Pinterest)
    //    y buscadores dentro de `search_other` (Bing, DuckDuckGo, Yahoo) a sus propios
    //    canales, descontando exacto del canal original para no duplicar métricas.
    const normalized = useMemo(() => {
        const subtractedFrom = new Map<string, SourceStat[]>();
        const promotedByKey = new Map<string, {
            channelKey: string;
            label: string;
            group: ChannelGroup;
            rows: SourceStat[];
        }>();

        for (const src of report.top_sources) {
            const platform = normalizePlatform(src.source);
            const rawKey = src.channel || '__unknown__';
            const targetKey = reclassifiedChannelKey(src.channel, platform);
            if (targetKey === rawKey) continue;

            const subList = subtractedFrom.get(rawKey) ?? [];
            subList.push(src);
            subtractedFrom.set(rawKey, subList);

            const bucket = promotedByKey.get(targetKey) ?? {
                channelKey: targetKey,
                label: platform.label,
                group: effectiveGroup(targetKey),
                rows: [],
            };
            bucket.rows.push(src);
            promotedByKey.set(targetKey, bucket);
        }

        const effectiveChannels: EffectiveChannel[] = [];
        for (const ch of report.channels) {
            const channelKey = ch.channel || '__unknown__';
            const subtracted = subtractedFrom.get(channelKey);
            if (subtracted && subtracted.length > 0) {
                const remaining = subtractMetrics(ch, subtracted);
                if (remaining.sessions > 0) {
                    effectiveChannels.push({
                        ...remaining,
                        channelKey,
                        label: channelDisplayLabel(channelKey, ch.label),
                        group: effectiveGroup(channelKey),
                    });
                }
                continue;
            }
            effectiveChannels.push({
                ...ch,
                channelKey,
                label: channelDisplayLabel(channelKey, ch.label),
                group: effectiveGroup(channelKey),
            });
        }

        for (const { channelKey, label, group, rows } of promotedByKey.values()) {
            const agg = sumMetrics(rows);
            if (agg.sessions > 0) {
                effectiveChannels.push({ ...agg, channelKey, label, group });
            }
        }

        // Reasigna `top_sources` y agrupa por plataforma normalizada dentro de cada canal.
        const sourcesByChannelRaw = new Map<string, SourceStat[]>();
        for (const src of report.top_sources) {
            const platform = normalizePlatform(src.source);
            const channelKey = reclassifiedChannelKey(src.channel, platform);
            const list = sourcesByChannelRaw.get(channelKey) ?? [];
            list.push(src);
            sourcesByChannelRaw.set(channelKey, list);
        }

        const sourcesByChannel = new Map<string, NormalizedSourceRow[]>();
        for (const [channelKey, list] of sourcesByChannelRaw.entries()) {
            const byPlatform = new Map<string, { platform: NormalizedPlatform; rows: SourceStat[]; raw: Set<string> }>();
            for (const src of list) {
                const platform = normalizePlatform(src.source);
                const bucket = byPlatform.get(platform.key) ?? { platform, rows: [], raw: new Set<string>() };
                bucket.rows.push(src);
                bucket.raw.add(src.source);
                byPlatform.set(platform.key, bucket);
            }
            const merged = [...byPlatform.values()]
                .map(({ platform, rows, raw }): NormalizedSourceRow => ({
                    ...sumMetrics(rows),
                    platform,
                    rawSources: [...raw],
                }))
                .sort((a, b) => b.sessions - a.sessions);
            sourcesByChannel.set(channelKey, merged);
        }

        // Reasigna `campaigns` a su canal efectivo y fusiona duplicados por `(canal, plataforma, campaña)`.
        const channelLabelMap = new Map<string, string>(
            effectiveChannels.map((c) => [c.channelKey, c.label]),
        );
        const campaignsByChannel = new Map<string, MergedCampaignRow[]>();
        const allCampaigns: MergedCampaignRow[] = [];

        const campBuckets = new Map<string, {
            channelKey: string;
            platform: NormalizedPlatform;
            campaign: string;
            rows: CampaignStat[];
            mediums: Set<string>;
        }>();

        for (const camp of report.campaigns) {
            const platform = normalizePlatform(camp.source);
            const channelKey = reclassifiedChannelKey(camp.channel, platform);
            const bucketKey = `${channelKey}|${platform.key}|${camp.campaign}`;
            const bucket = campBuckets.get(bucketKey) ?? {
                channelKey,
                platform,
                campaign: camp.campaign,
                rows: [],
                mediums: new Set<string>(),
            };
            bucket.rows.push(camp);
            if (camp.medium) bucket.mediums.add(camp.medium);
            campBuckets.set(bucketKey, bucket);
        }

        for (const [bucketKey, bucket] of campBuckets.entries()) {
            const group = effectiveGroup(bucket.channelKey);
            const mediums = [...bucket.mediums];
            const isPaid = group === 'paid' || mediums.some((m) => isPaidMedium(m, group));
            const mergedRow: MergedCampaignRow = {
                ...sumMetrics(bucket.rows),
                key: bucketKey,
                campaign: bucket.campaign,
                platform: bucket.platform,
                channelKey: bucket.channelKey,
                channelLabel: channelLabelMap.get(bucket.channelKey) ?? channelDisplayLabel(bucket.channelKey),
                mediums,
                isPaid,
            };
            allCampaigns.push(mergedRow);
            const list = campaignsByChannel.get(bucket.channelKey) ?? [];
            list.push(mergedRow);
            campaignsByChannel.set(bucket.channelKey, list);
        }

        for (const list of campaignsByChannel.values()) {
            list.sort((a, b) => b.sessions - a.sessions);
        }
        allCampaigns.sort((a, b) => b.sessions - a.sessions);

        const unknown = effectiveChannels.find((row) => row.channelKey === '__unknown__')?.sessions ?? 0;
        const direct = effectiveChannels.find((row) => row.channelKey === 'direct')?.sessions ?? 0;

        return {
            effectiveChannels,
            sourcesByChannel,
            campaignsByChannel,
            allCampaigns,
            unknown,
            direct,
        };
    }, [report.channels, report.top_sources, report.campaigns]);

    // 2. Vista «Por categoría» (Categoría -> Canal -> Orígenes normalizados + Campañas + Sin campaña).
    const categoryView = useMemo(() => {
        const grouped: GroupedCategory[] = [];
        const withChildren: string[] = [];

        const matchesChannelFilter = (ch: EffectiveChannel): boolean => {
            if (trafficFilter === 'paid') return ch.group === 'paid';
            if (trafficFilter === 'organic') return ch.group !== 'paid' && ch.group !== 'unknown';
            if (trafficFilter === 'campaign') return (normalized.campaignsByChannel.get(ch.channelKey)?.length ?? 0) > 0;
            return true;
        };

        for (const group of CHANNEL_GROUPS) {
            const channels = normalized.effectiveChannels
                .filter((c) => c.group === group.key && matchesChannelFilter(c))
                .sort((a, b) => b.sessions - a.sessions);
            if (channels.length === 0) continue;

            const metrics = sumMetrics(channels);
            if (metrics.sessions <= 0) continue;

            for (const ch of channels) {
                const srcs = normalized.sourcesByChannel.get(ch.channelKey) ?? [];
                const camps = normalized.campaignsByChannel.get(ch.channelKey) ?? [];
                if (srcs.length > 0 || camps.length > 0) {
                    withChildren.push(ch.channelKey);
                }
            }

            grouped.push({ group, metrics, channels });
        }

        grouped.sort((a, b) => b.metrics.sessions - a.metrics.sessions);

        return {
            categories: grouped,
            expandableChannels: withChildren,
        };
    }, [normalized, trafficFilter]);

    // 3. Vista «Por plataforma» (unifica Pagado + Orgánico bajo una misma plataforma, ej. Instagram o ChatGPT).
    const platformView = useMemo(() => {
        const byPlatform = new Map<string, {
            platform: NormalizedPlatform;
            items: PlatformBreakdownItem[];
        }>();

        const addItem = (platform: NormalizedPlatform, item: PlatformBreakdownItem) => {
            if (item.sessions <= 0) return;
            const bucket = byPlatform.get(platform.key) ?? { platform, items: [] };
            bucket.items.push(item);
            byPlatform.set(platform.key, bucket);
        };

        for (const ch of normalized.effectiveChannels) {
            if (ch.sessions <= 0) continue;
            const isPaid = ch.group === 'paid';
            const channelCampaigns = normalized.campaignsByChannel.get(ch.channelKey) ?? [];

            if (ch.channelKey === 'direct') {
                addItem({ key: 'direct', label: 'Directo' }, {
                    ...ch,
                    key: `item:${ch.channelKey}:direct`,
                    channelKey: ch.channelKey,
                    channelLabel: ch.label,
                    group: ch.group,
                    isPaid: false,
                    rawSources: [],
                    campaigns: [],
                });
                continue;
            }
            if (ch.channelKey === '__unknown__') {
                addItem({ key: 'unknown', label: 'Sin dato' }, {
                    ...ch,
                    key: `item:${ch.channelKey}:unknown`,
                    channelKey: ch.channelKey,
                    channelLabel: ch.label,
                    group: ch.group,
                    isPaid: false,
                    rawSources: [],
                    campaigns: [],
                });
                continue;
            }

            const normSources = normalized.sourcesByChannel.get(ch.channelKey) ?? [];
            if (normSources.length === 0) {
                addItem({ key: `ch:${ch.channelKey}`, label: ch.label }, {
                    ...ch,
                    key: `item:${ch.channelKey}:only`,
                    channelKey: ch.channelKey,
                    channelLabel: ch.label,
                    group: ch.group,
                    isPaid,
                    rawSources: [],
                    campaigns: channelCampaigns,
                });
                continue;
            }

            for (const srcRow of normSources) {
                const matchingCamps = channelCampaigns.filter(
                    (camp) => camp.platform.key === srcRow.platform.key,
                );
                addItem(srcRow.platform, {
                    ...srcRow,
                    key: `item:${ch.channelKey}:${srcRow.platform.key}`,
                    channelKey: ch.channelKey,
                    channelLabel: ch.label,
                    group: ch.group,
                    isPaid,
                    rawSources: srcRow.rawSources,
                    campaigns: matchingCamps,
                });
            }

            const remainder = subtractMetrics(ch, normSources);
            if (remainder.sessions > 0) {
                addItem({ key: `other:${ch.channelKey}`, label: `${ch.label} (otros)` }, {
                    ...remainder,
                    key: `item:${ch.channelKey}:rest`,
                    channelKey: ch.channelKey,
                    channelLabel: ch.label,
                    group: ch.group,
                    isPaid,
                    rawSources: [],
                    campaigns: [],
                });
            }
        }

        const rows: PlatformRow[] = [];
        for (const { platform, items } of byPlatform.values()) {
            const filteredItems: PlatformBreakdownItem[] = [];

            for (const item of items) {
                if (trafficFilter === 'paid' && !item.isPaid) continue;
                if (trafficFilter === 'organic' && (item.isPaid || item.group === 'unknown')) continue;
                if (trafficFilter === 'campaign') {
                    if (item.campaigns.length === 0) continue;
                    const campMetrics = sumMetrics(item.campaigns);
                    if (campMetrics.sessions <= 0) continue;
                    filteredItems.push({
                        ...campMetrics,
                        key: item.key,
                        channelKey: item.channelKey,
                        channelLabel: item.channelLabel,
                        group: item.group,
                        isPaid: item.isPaid,
                        rawSources: item.rawSources,
                        campaigns: item.campaigns,
                    });
                    continue;
                }
                filteredItems.push(item);
            }

            if (filteredItems.length === 0) continue;
            filteredItems.sort((a, b) => b.sessions - a.sessions);

            const metrics = sumMetrics(filteredItems);
            const hasPaid = filteredItems.some((i) => i.isPaid);
            const hasOrganic = filteredItems.some((i) => !i.isPaid);
            const isPaidMix = hasPaid && hasOrganic ? 'mixed' : hasPaid ? 'paid' : 'organic';
            const campaignCount = filteredItems.reduce((acc, i) => acc + i.campaigns.length, 0);

            rows.push({
                platform,
                metrics,
                items: filteredItems,
                isPaidMix,
                campaignCount,
            });
        }

        rows.sort((a, b) => b.metrics.sessions - a.metrics.sessions);
        const expandableKeys = rows
            .filter((r) => r.items.length > 1 || r.campaignCount > 0 || r.items.some((i) => i.rawSources.length > 0))
            .map((r) => r.platform.key);

        return { rows, expandableKeys };
    }, [normalized, trafficFilter]);

    // 4. Filtros y agrupación de «Campañas etiquetadas».
    const campaignSection = useMemo(() => {
        const distinctNames = [...new Set(normalized.allCampaigns.map((c) => c.campaign))];
        const filtered = normalized.allCampaigns.filter((row) => {
            if (campaignMedium === 'paid' && !row.isPaid) return false;
            if (campaignMedium === 'organic' && row.isPaid) return false;
            if (selectedCampaign !== 'all' && row.campaign !== selectedCampaign) return false;
            return true;
        });

        const byName = new Map<string, {
            rows: MergedCampaignRow[];
            platforms: Set<string>;
            mediums: Set<string>;
        }>();

        for (const row of filtered) {
            const bucket = byName.get(row.campaign) ?? {
                rows: [],
                platforms: new Set<string>(),
                mediums: new Set<string>(),
            };
            bucket.rows.push(row);
            bucket.platforms.add(row.platform.label);
            for (const m of row.mediums) bucket.mediums.add(m);
            byName.set(row.campaign, bucket);
        }

        const groupedSummaries: GroupedCampaignSummary[] = [...byName.entries()]
            .map(([campaign, bucket]) => {
                const paidCount = bucket.rows.filter((r) => r.isPaid).length;
                return {
                    ...sumMetrics(bucket.rows),
                    campaign,
                    platforms: [...bucket.platforms],
                    mediums: [...bucket.mediums],
                    isPaid: paidCount > 0,
                    hasMixedCost: paidCount > 0 && paidCount < bucket.rows.length,
                    rowCount: bucket.rows.length,
                };
            })
            .sort((a, b) => b.sessions - a.sessions);

        return {
            distinctNames,
            filtered,
            groupedSummaries,
        };
    }, [normalized.allCampaigns, campaignMedium, selectedCampaign]);

    if (total === 0) {
        return <Text c="dimmed" fz="sm">Sin sesiones en este periodo.</Text>;
    }

    const toggleGroup = (key: ChannelGroup) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleChannel = (channelKey: string) => {
        setExpandedChannels((prev) => {
            const next = new Set(prev);
            if (next.has(channelKey)) next.delete(channelKey);
            else next.add(channelKey);
            return next;
        });
    };

    const togglePlatform = (platformKey: string) => {
        setExpandedPlatforms((prev) => {
            const next = new Set(prev);
            if (next.has(platformKey)) next.delete(platformKey);
            else next.add(platformKey);
            return next;
        });
    };

    const expandAll = () => {
        if (viewMode === 'category') {
            setCollapsedGroups(new Set());
            setExpandedChannels(new Set(categoryView.expandableChannels));
        } else {
            setExpandedPlatforms(new Set(platformView.expandableKeys));
        }
    };

    const collapseAll = () => {
        if (viewMode === 'category') {
            setCollapsedGroups(new Set(categoryView.categories.map((c) => c.group.key)));
            setExpandedChannels(new Set());
        } else {
            setExpandedPlatforms(new Set());
        }
    };

    return (
        <Stack gap="lg">
            <Text fz="xs" c="dimmed">
                Las sesiones son estimadas por identificador y día. Una sesión puede hacer varios clics;
                la conversión cuenta las sesiones que salen a una tienda.
            </Text>
            {report.totals.funnel_complete !== true && (
                <Alert color="gray" variant="light">
                    El embudo no está disponible para todo el periodo.
                </Alert>
            )}
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Box>
                    <Text fz="sm" c="dimmed">Sesiones estimadas</Text>
                    <Text fw={700} fz="xl">{count(total)}</Text>
                </Box>
                <Box>
                    <Text fz="sm" c="dimmed">Llegan a una ficha</Text>
                    <Text fw={700} fz="xl">{count(report.totals.sessions_with_game_view)}</Text>
                    <Text fz="xs" c="dimmed">{percent(report.totals.session_game_view_rate)}</Text>
                </Box>
                <Box>
                    <Text fz="sm" c="dimmed">Salen a una tienda</Text>
                    <Text fw={700} fz="xl">{count(report.totals.sessions_with_exit)}</Text>
                    <Text fz="xs" c="dimmed">{percent(report.totals.session_exit_rate)}</Text>
                </Box>
            </SimpleGrid>
            {normalized.unknown > 0 && (
                <Alert color="gray" variant="light">
                    {normalized.unknown.toLocaleString('es-CL')} sesiones son anteriores a que se midiera el
                    origen y aparecen como «Sin dato».
                </Alert>
            )}

            <SourcesChart series={report.series} />

            <Box>
                <Group justify="space-between" align="center" mb="xs" wrap="wrap" gap="sm">
                    <Group gap="sm" wrap="wrap">
                        <SegmentedControl
                            size="xs"
                            aria-label="Agrupación de origen"
                            value={viewMode}
                            onChange={(val) => setViewMode(val as ViewMode)}
                            data={[
                                { label: 'Por categoría', value: 'category' },
                                { label: 'Por plataforma', value: 'platform' },
                            ]}
                        />
                        <SegmentedControl
                            size="xs"
                            aria-label="Filtro de tráfico"
                            value={trafficFilter}
                            onChange={(val) => setTrafficFilter(val as TrafficFilter)}
                            data={[
                                { label: 'Todos', value: 'all' },
                                { label: 'Orgánico', value: 'organic' },
                                { label: 'Pagado', value: 'paid' },
                                { label: 'Con campaña', value: 'campaign' },
                            ]}
                        />
                    </Group>
                    <Group gap="xs">
                        <Button variant="subtle" size="xs" onClick={expandAll}>
                            Expandir todo
                        </Button>
                        <Button variant="subtle" size="xs" color="gray" onClick={collapseAll}>
                            Contraer todo
                        </Button>
                    </Group>
                </Group>

                <Text fz="xs" c="dimmed" mb="xs">
                    {viewMode === 'category'
                        ? 'Haz clic en una categoría o en un canal con detalle para desplegar plataformas normalizadas y campañas.'
                        : 'Plataformas normalizadas unificando tráfico pagado y orgánico. Haz clic en una plataforma para ver su desglose.'}
                </Text>

                <Table.ScrollContainer minWidth={720}>
                    <Table verticalSpacing="xs" fz="sm" aria-label="Embudo por canal">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>
                                    {viewMode === 'category' ? 'Categoría / Canal / Origen' : 'Plataforma / Canal / Campaña'}
                                </Table.Th>
                                <Table.Th ta="right">Sesiones estimadas</Table.Th>
                                <Table.Th ta="right">Con ficha</Table.Th>
                                <Table.Th ta="right">Salen a tienda</Table.Th>
                                <Table.Th ta="right">Clics a tienda</Table.Th>
                                <Table.Th ta="right">Conversión</Table.Th>
                                <Table.Th w="20%">Del total</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {viewMode === 'category' ? (
                                categoryView.categories.length === 0 ? (
                                    <Table.Tr>
                                        <Table.Td colSpan={7}>
                                            <Text fz="sm" c="dimmed" ta="center" py="sm">
                                                No hay canales para el filtro seleccionado.
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ) : (
                                    categoryView.categories.map(({ group, metrics, channels }) => {
                                        const groupExpanded = !collapsedGroups.has(group.key);
                                        const groupShare = (metrics.sessions / total) * 100;
                                        const dotColor = CHANNEL_GROUP_COLORS[group.key][scheme === 'dark' ? 'dark' : 'light'];
                                        const Chevron = groupExpanded ? IconChevronDown : IconChevronRight;

                                        return (
                                            <Fragment key={group.key}>
                                                <Table.Tr
                                                    onClick={() => toggleGroup(group.key)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: 'var(--mantine-color-default-hover)',
                                                    }}
                                                >
                                                    <Table.Td>
                                                        <UnstyledButton
                                                            aria-expanded={groupExpanded}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleGroup(group.key);
                                                            }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
                                                        >
                                                            <Chevron size={15} style={{ flexShrink: 0 }} />
                                                            <Box
                                                                w={10}
                                                                h={10}
                                                                style={{
                                                                    borderRadius: '50%',
                                                                    backgroundColor: dotColor,
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            <Text fw={700} fz="sm">{group.label}</Text>
                                                            <Badge size="xs" variant="light" color="gray">
                                                                {channels.length} {channels.length === 1 ? 'canal' : 'canales'}
                                                            </Badge>
                                                        </UnstyledButton>
                                                    </Table.Td>
                                                    <FunnelCells row={metrics} />
                                                    <Table.Td>
                                                        <Group gap="xs" wrap="nowrap">
                                                            <Progress value={groupShare} size="sm" radius="xl" style={{ flex: 1 }} aria-hidden />
                                                            <Text fz="xs" fw={600} w={42} ta="right">{percent(groupShare)}</Text>
                                                        </Group>
                                                    </Table.Td>
                                                </Table.Tr>

                                                {groupExpanded && channels.map((row) => {
                                                    const channelSources = normalized.sourcesByChannel.get(row.channelKey) ?? [];
                                                    const channelCampaigns = normalized.campaignsByChannel.get(row.channelKey) ?? [];
                                                    const taggedCampaignSum = sumMetrics(channelCampaigns);
                                                    const untaggedRemainder =
                                                        channelCampaigns.length > 0 && row.sessions > taggedCampaignSum.sessions
                                                            ? subtractMetrics(row, channelCampaigns)
                                                            : null;

                                                    const detailCount = channelSources.length + channelCampaigns.length;
                                                    const hasDetails = detailCount > 0;
                                                    const channelExpanded = hasDetails && expandedChannels.has(row.channelKey);
                                                    const channelShare = (row.sessions / total) * 100;
                                                    const ChannelChevron = channelExpanded ? IconChevronDown : IconChevronRight;

                                                    return (
                                                        <Fragment key={row.channelKey}>
                                                            <Table.Tr
                                                                onClick={hasDetails ? () => toggleChannel(row.channelKey) : undefined}
                                                                style={hasDetails ? { cursor: 'pointer' } : undefined}
                                                            >
                                                                <Table.Td pl="lg">
                                                                    {hasDetails ? (
                                                                        <UnstyledButton
                                                                            aria-expanded={channelExpanded}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleChannel(row.channelKey);
                                                                            }}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}
                                                                        >
                                                                            <ChannelChevron size={14} style={{ flexShrink: 0 }} />
                                                                            <Text fz="sm" fw={500}>{row.label}</Text>
                                                                            <Badge size="xs" variant="outline" color="gray">
                                                                                {detailCount}
                                                                            </Badge>
                                                                        </UnstyledButton>
                                                                    ) : (
                                                                        <Group gap={6} wrap="nowrap" pl={20}>
                                                                            <Text fz="sm">{row.label}</Text>
                                                                        </Group>
                                                                    )}
                                                                </Table.Td>
                                                                <FunnelCells row={row} />
                                                                <Table.Td>
                                                                    <Group gap="xs" wrap="nowrap">
                                                                        <Progress value={channelShare} size="xs" radius="xl" style={{ flex: 1 }} aria-hidden />
                                                                        <Text fz="xs" c="dimmed" w={42} ta="right">{percent(channelShare)}</Text>
                                                                    </Group>
                                                                </Table.Td>
                                                            </Table.Tr>

                                                            {channelExpanded && channelSources.map((src) => {
                                                                const srcShare = (src.sessions / total) * 100;
                                                                return (
                                                                    <Table.Tr
                                                                        key={`src:${row.channelKey}:${src.platform.key}`}
                                                                        style={{
                                                                            backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
                                                                        }}
                                                                    >
                                                                        <Table.Td pl={44}>
                                                                            <Group gap="xs" wrap="nowrap" align="flex-start">
                                                                                <Badge size="xs" variant="light" color="gray" mt={2}>Origen</Badge>
                                                                                <Box>
                                                                                    <Text fz="xs" fw={600}>{src.platform.label}</Text>
                                                                                    {src.rawSources.length > 0 && (
                                                                                        <Text fz="xs" c="dimmed">
                                                                                            {src.rawSources.join(' · ')}
                                                                                        </Text>
                                                                                    )}
                                                                                </Box>
                                                                            </Group>
                                                                        </Table.Td>
                                                                        <FunnelCells row={src} />
                                                                        <Table.Td>
                                                                            <Text fz="xs" c="dimmed" ta="right">{percent(srcShare)}</Text>
                                                                        </Table.Td>
                                                                    </Table.Tr>
                                                                );
                                                            })}

                                                            {channelExpanded && channelCampaigns.map((camp) => {
                                                                const campShare = (camp.sessions / total) * 100;
                                                                return (
                                                                    <Table.Tr
                                                                        key={`camp:${camp.key}`}
                                                                        style={{
                                                                            backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
                                                                        }}
                                                                    >
                                                                        <Table.Td pl={44}>
                                                                            <Group gap="xs" wrap="nowrap" align="flex-start">
                                                                                <Badge size="xs" variant="light" color="info" mt={2}>Campaña</Badge>
                                                                                <Box>
                                                                                    <Group gap={6} wrap="wrap">
                                                                                        <Text fz="xs" fw={600}>{camp.campaign}</Text>
                                                                                        {camp.mediums.length > 0
                                                                                            ? camp.mediums.map((m) => (
                                                                                                <MediumBadge
                                                                                                    key={m}
                                                                                                    medium={m}
                                                                                                    isPaid={isPaidMedium(m, row.group)}
                                                                                                />
                                                                                            ))
                                                                                            : <MediumBadge medium="" isPaid={camp.isPaid} />}
                                                                                    </Group>
                                                                                    <Text fz="xs" c="dimmed">
                                                                                        {camp.platform.label}
                                                                                        {camp.mediums.length > 0 ? ` · ${camp.mediums.join(', ')}` : ''}
                                                                                    </Text>
                                                                                </Box>
                                                                            </Group>
                                                                        </Table.Td>
                                                                        <FunnelCells row={camp} />
                                                                        <Table.Td>
                                                                            <Text fz="xs" c="dimmed" ta="right">{percent(campShare)}</Text>
                                                                        </Table.Td>
                                                                    </Table.Tr>
                                                                );
                                                            })}

                                                            {channelExpanded && untaggedRemainder && untaggedRemainder.sessions > 0 && (
                                                                <Table.Tr
                                                                    key={`untagged:${row.channelKey}`}
                                                                    style={{
                                                                        backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
                                                                    }}
                                                                >
                                                                    <Table.Td pl={44}>
                                                                        <Group gap="xs" wrap="nowrap">
                                                                            <Badge size="xs" variant="outline" color="gray">Sin campaña</Badge>
                                                                            <Text fz="xs" c="dimmed">Sin etiqueta utm_campaign</Text>
                                                                        </Group>
                                                                    </Table.Td>
                                                                    <FunnelCells row={untaggedRemainder} />
                                                                    <Table.Td>
                                                                        <Text fz="xs" c="dimmed" ta="right">
                                                                            {percent((untaggedRemainder.sessions / total) * 100)}
                                                                        </Text>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            )}
                                                        </Fragment>
                                                    );
                                                })}
                                            </Fragment>
                                        );
                                    })
                                )
                            ) : platformView.rows.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={7}>
                                        <Text fz="sm" c="dimmed" ta="center" py="sm">
                                            No hay plataformas para el filtro seleccionado.
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                platformView.rows.map((pRow) => {
                                    const hasChildren =
                                        pRow.items.length > 1
                                        || pRow.campaignCount > 0
                                        || pRow.items.some((i) => i.rawSources.length > 0);
                                    const isExpanded = hasChildren && expandedPlatforms.has(pRow.platform.key);
                                    const pShare = (pRow.metrics.sessions / total) * 100;
                                    const Chevron = isExpanded ? IconChevronDown : IconChevronRight;

                                    return (
                                        <Fragment key={pRow.platform.key}>
                                            <Table.Tr
                                                onClick={hasChildren ? () => togglePlatform(pRow.platform.key) : undefined}
                                                style={{
                                                    cursor: hasChildren ? 'pointer' : undefined,
                                                    backgroundColor: 'var(--mantine-color-default-hover)',
                                                }}
                                            >
                                                <Table.Td>
                                                    {hasChildren ? (
                                                        <UnstyledButton
                                                            aria-expanded={isExpanded}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                togglePlatform(pRow.platform.key);
                                                            }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
                                                        >
                                                            <Chevron size={15} style={{ flexShrink: 0 }} />
                                                            <Text fw={700} fz="sm">{pRow.platform.label}</Text>
                                                            {pRow.isPaidMix === 'mixed' ? (
                                                                <Badge size="xs" variant="light" color="grape">Pagado + Orgánico</Badge>
                                                            ) : pRow.isPaidMix === 'paid' ? (
                                                                <Badge size="xs" variant="light" color="orange">Pagado</Badge>
                                                            ) : pRow.platform.key !== 'direct' && pRow.platform.key !== 'unknown' ? (
                                                                <Badge size="xs" variant="light" color="blue">Orgánico</Badge>
                                                            ) : null}
                                                            {pRow.campaignCount > 0 && (
                                                                <Badge size="xs" variant="outline" color="info">
                                                                    {pRow.campaignCount} {pRow.campaignCount === 1 ? 'campaña' : 'campañas'}
                                                                </Badge>
                                                            )}
                                                        </UnstyledButton>
                                                    ) : (
                                                        <Group gap="xs" wrap="nowrap" pl={23}>
                                                            <Text fw={700} fz="sm">{pRow.platform.label}</Text>
                                                        </Group>
                                                    )}
                                                </Table.Td>
                                                <FunnelCells row={pRow.metrics} />
                                                <Table.Td>
                                                    <Group gap="xs" wrap="nowrap">
                                                        <Progress value={pShare} size="sm" radius="xl" style={{ flex: 1 }} aria-hidden />
                                                        <Text fz="xs" fw={600} w={42} ta="right">{percent(pShare)}</Text>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>

                                            {isExpanded && pRow.items.map((item) => {
                                                const itemShare = (item.sessions / total) * 100;
                                                const campSummary = sumMetrics(item.campaigns);
                                                const untaggedSessions =
                                                    trafficFilter !== 'campaign'
                                                    && item.campaigns.length > 0
                                                    && item.sessions > campSummary.sessions
                                                        ? subtractMetrics(item, item.campaigns)
                                                        : null;

                                                return (
                                                    <Fragment key={item.key}>
                                                        <Table.Tr>
                                                            <Table.Td pl="xl">
                                                                <Group gap="xs" wrap="wrap" align="center">
                                                                    <Badge
                                                                        size="xs"
                                                                        variant="light"
                                                                        color={item.isPaid ? 'orange' : 'blue'}
                                                                    >
                                                                        {item.isPaid ? 'Pagado' : 'Orgánico'}
                                                                    </Badge>
                                                                    <Text fz="xs" fw={600}>{item.channelLabel}</Text>
                                                                    {item.rawSources.length > 0 && (
                                                                        <Text fz="xs" c="dimmed">
                                                                            ({item.rawSources.join(' · ')})
                                                                        </Text>
                                                                    )}
                                                                </Group>
                                                            </Table.Td>
                                                            <FunnelCells row={item} />
                                                            <Table.Td>
                                                                <Text fz="xs" c="dimmed" ta="right">{percent(itemShare)}</Text>
                                                            </Table.Td>
                                                        </Table.Tr>

                                                        {item.campaigns.map((camp) => (
                                                            <Table.Tr
                                                                key={`plat-camp:${item.key}:${camp.key}`}
                                                                style={{
                                                                    backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
                                                                }}
                                                            >
                                                                <Table.Td pl={52}>
                                                                    <Group gap="xs" wrap="wrap">
                                                                        <Badge size="xs" variant="light" color="info">Campaña</Badge>
                                                                        <Text fz="xs" fw={600}>{camp.campaign}</Text>
                                                                        {camp.mediums.map((m) => (
                                                                            <MediumBadge
                                                                                key={m}
                                                                                medium={m}
                                                                                isPaid={isPaidMedium(m, item.group)}
                                                                            />
                                                                        ))}
                                                                    </Group>
                                                                </Table.Td>
                                                                <FunnelCells row={camp} />
                                                                <Table.Td>
                                                                    <Text fz="xs" c="dimmed" ta="right">
                                                                        {percent((camp.sessions / total) * 100)}
                                                                    </Text>
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}

                                                        {untaggedSessions && untaggedSessions.sessions > 0 && (
                                                            <Table.Tr
                                                                key={`plat-untagged:${item.key}`}
                                                                style={{
                                                                    backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
                                                                }}
                                                            >
                                                                <Table.Td pl={52}>
                                                                    <Group gap="xs" wrap="nowrap">
                                                                        <Badge size="xs" variant="outline" color="gray">Sin campaña</Badge>
                                                                        <Text fz="xs" c="dimmed">Sin etiqueta utm_campaign</Text>
                                                                    </Group>
                                                                </Table.Td>
                                                                <FunnelCells row={untaggedSessions} />
                                                                <Table.Td>
                                                                    <Text fz="xs" c="dimmed" ta="right">
                                                                        {percent((untaggedSessions.sessions / total) * 100)}
                                                                    </Text>
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>

            {report.campaigns.length > 0 && (
                <Accordion defaultValue="campaigns" variant="separated" radius="md">
                    <Accordion.Item value="campaigns">
                        <Accordion.Control>
                            <Group gap="xs">
                                <Text fw={600} fz="sm">Campañas etiquetadas</Text>
                                <Badge size="xs" variant="light" color="info">
                                    {campaignSection.filtered.length}
                                </Badge>
                                <Text fz="xs" c="dimmed">Comparativa transversal con utm_campaign</Text>
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="sm">
                                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                                    <Group gap="sm" wrap="wrap">
                                        <SegmentedControl
                                            size="xs"
                                            aria-label="Medio de campaña"
                                            value={campaignMedium}
                                            onChange={(val) => setCampaignMedium(val as CampaignMediumFilter)}
                                            data={[
                                                { label: 'Todos', value: 'all' },
                                                { label: 'Pagado', value: 'paid' },
                                                { label: 'Social / Orgánico', value: 'organic' },
                                            ]}
                                        />
                                        <SegmentedControl
                                            size="xs"
                                            aria-label="Tipo de vista de campaña"
                                            value={campaignGroupMode}
                                            onChange={(val) => setCampaignGroupMode(val as CampaignGroupMode)}
                                            data={[
                                                { label: 'Todas', value: 'detailed' },
                                                { label: 'Por campaña (agrupado)', value: 'grouped' },
                                            ]}
                                        />
                                    </Group>
                                    {campaignSection.distinctNames.length > 1 && (
                                        <NativeSelect
                                            size="xs"
                                            aria-label="Filtrar por campaña"
                                            value={selectedCampaign}
                                            onChange={(e) => setSelectedCampaign(e.currentTarget.value)}
                                            data={[
                                                { label: 'Todas las campañas', value: 'all' },
                                                ...campaignSection.distinctNames.map((name) => ({
                                                    label: name,
                                                    value: name,
                                                })),
                                            ]}
                                        />
                                    )}
                                </Group>

                                <Table.ScrollContainer minWidth={600}>
                                    <Table striped verticalSpacing="xs" fz="sm" aria-label="Embudo por campaña">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Campaña</Table.Th>
                                                <Table.Th ta="right">Sesiones estimadas</Table.Th>
                                                <Table.Th ta="right">Con ficha</Table.Th>
                                                <Table.Th ta="right">Salen a tienda</Table.Th>
                                                <Table.Th ta="right">Clics a tienda</Table.Th>
                                                <Table.Th ta="right">Conversión</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {campaignGroupMode === 'detailed' ? (
                                                campaignSection.filtered.length === 0 ? (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={6}>
                                                            <Text fz="sm" c="dimmed" ta="center" py="sm">
                                                                Sin campañas para el filtro seleccionado.
                                                            </Text>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ) : (
                                                    campaignSection.filtered.map((row) => (
                                                        <Table.Tr key={row.key}>
                                                            <Table.Td>
                                                                <Group gap="xs" wrap="wrap">
                                                                    <Text fz="sm" fw={500}>{row.campaign}</Text>
                                                                    {row.mediums.length > 0
                                                                        ? row.mediums.map((m) => (
                                                                            <MediumBadge
                                                                                key={m}
                                                                                medium={m}
                                                                                isPaid={isPaidMedium(m, effectiveGroup(row.channelKey))}
                                                                            />
                                                                        ))
                                                                        : <MediumBadge medium="" isPaid={row.isPaid} />}
                                                                </Group>
                                                                <Text fz="xs" c="dimmed">
                                                                    {row.platform.label}
                                                                    {row.channelLabel !== row.platform.label ? ` · ${row.channelLabel}` : ''}
                                                                    {row.mediums.length > 0 ? ` · ${row.mediums.join(', ')}` : ''}
                                                                </Text>
                                                            </Table.Td>
                                                            <FunnelCells row={row} />
                                                        </Table.Tr>
                                                    ))
                                                )
                                            ) : campaignSection.groupedSummaries.length === 0 ? (
                                                <Table.Tr>
                                                    <Table.Td colSpan={6}>
                                                        <Text fz="sm" c="dimmed" ta="center" py="sm">
                                                            Sin campañas para el filtro seleccionado.
                                                        </Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ) : (
                                                campaignSection.groupedSummaries.map((row) => (
                                                    <Table.Tr key={`grouped:${row.campaign}`}>
                                                        <Table.Td>
                                                            <Group gap="xs" wrap="wrap">
                                                                <Text fz="sm" fw={600}>{row.campaign}</Text>
                                                                {row.hasMixedCost ? (
                                                                    <Badge size="xs" variant="light" color="grape">Pagado + Orgánico</Badge>
                                                                ) : (
                                                                    <MediumBadge
                                                                        medium={row.mediums[0] ?? ''}
                                                                        isPaid={row.isPaid}
                                                                    />
                                                                )}
                                                            </Group>
                                                            <Text fz="xs" c="dimmed">
                                                                {row.platforms.join(', ')}
                                                                {row.mediums.length > 0 ? ` · ${row.mediums.join(', ')}` : ''}
                                                            </Text>
                                                        </Table.Td>
                                                        <FunnelCells row={row} />
                                                    </Table.Tr>
                                                ))
                                            )}
                                        </Table.Tbody>
                                    </Table>
                                </Table.ScrollContainer>
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
            )}

            {/* Instagram y TikTok abren los enlaces en su navegador interno, que
                muchas veces no envía referrer: sin etiqueta, esa gente cuenta
                como directa. Solo se avisa cuando directo pesa lo bastante como
                para esconder algo. */}
            {normalized.direct / total > 0.4 && (
                <Text fz="xs" c="dimmed">
                    «Directo» incluye a quien llega desde apps que no informan el origen, como
                    Instagram o TikTok. Para separarlo, etiqueta tus enlaces:{' '}
                    <code>?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=bio</code>.
                </Text>
            )}
        </Stack>
    );
}
