'use client';

import { Badge, Box, Group, Paper, Progress, Stack, Text, Tooltip as MantineTooltip, useMantineColorScheme } from '@mantine/core';
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import type { GameRating, GameRatingSource } from '@/lib/types';
import { chart } from '@/lib/colors';

interface GameRatingsChartProps {
    ratings: GameRating[];
}

interface NormalizedRating extends GameRating {
    axisLabel: string;
    sourceLabel: string;
    normalized: number;
    displayScore: string;
}

const SOURCE_META: Record<GameRatingSource, { label: string; shortLabel: string; order: number }> = {
    metacritic: { label: 'Metacritic', shortLabel: 'MC', order: 0 },
    opencritic: { label: 'OpenCritic', shortLabel: 'OC', order: 1 },
    igdb_critics: { label: 'IGDB (crítica)', shortLabel: 'IGDB-C', order: 2 },
    igdb_users: { label: 'IGDB (usuarios)', shortLabel: 'IGDB-U', order: 3 },
    steam: { label: 'Steam', shortLabel: 'Steam', order: 4 },
};

function normalizeRatings(ratings: GameRating[]): NormalizedRating[] {
    return ratings
        .flatMap((rating) => {
            const score = Number(rating.score);
            const scale = Number(rating.scale);
            if (!Number.isFinite(score) || !Number.isFinite(scale) || scale <= 0 || score < 0 || score > scale) {
                return [];
            }
            const normalized = score / scale * 10;
            const sourceLabel = SOURCE_META[rating.source]?.label ?? rating.source;
            const shortLabel = SOURCE_META[rating.source]?.shortLabel ?? rating.source;
            const displayScore = normalized.toFixed(1);
            return [{
                ...rating,
                sourceLabel,
                normalized,
                displayScore,
                axisLabel: `${shortLabel}|${sourceLabel}|${displayScore}`,
            }];
        })
        .sort((a, b) => (
            (SOURCE_META[a.source]?.order ?? Number.MAX_SAFE_INTEGER)
            - (SOURCE_META[b.source]?.order ?? Number.MAX_SAFE_INTEGER)
        ));
}

interface RatingAxisTickProps {
    x?: number;
    y?: number;
    cx?: number;
    cy?: number;
    payload?: { value?: string };
}

function RatingAxisTick({ x = 0, y = 0, cx = 0, cy = 0, payload }: RatingAxisTickProps) {
    const [shortLabel = '', label = '', score = ''] = String(payload?.value ?? '').split('|');
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.hypot(dx, dy) || 1;
    const labelX = x + (dx / distance) * 14;
    const labelY = y + (dy / distance) * 14;

    return (
        <foreignObject
            x={labelX - 47}
            y={labelY - 15}
            width={94}
            height={30}
            style={{ overflow: 'visible' }}
        >
            <Box
                h={30}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <MantineTooltip label={`${label}: ${score}/10`} withArrow>
                    <Badge
                        size="sm"
                        radius="xl"
                        variant="light"
                        color="gray"
                        style={{ cursor: 'help' }}
                    >
                        {shortLabel}
                    </Badge>
                </MantineTooltip>
            </Box>
        </foreignObject>
    );
}

interface RatingTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: NormalizedRating }>;
    dark: boolean;
}

function RatingTooltip({ active, payload, dark }: RatingTooltipProps) {
    const rating = payload?.[0]?.payload;
    if (!active || !rating) return null;

    return (
        <Paper
            withBorder
            shadow="md"
            radius="md"
            p="xs"
            style={{ background: dark ? chart.tooltipBg.dark : chart.tooltipBg.light }}
        >
            <Text fz="xs" fw={700}>{rating.sourceLabel}</Text>
            <Text fz="xs">{rating.displayScore}/10 · {rating.score}/{rating.scale}</Text>
            {rating.count != null && (
                <Text fz="xs" c="dimmed">
                    {new Intl.NumberFormat('es-CL').format(rating.count)} reseñas
                </Text>
            )}
            {rating.label && <Text fz="xs" c="dimmed">{rating.label}</Text>}
        </Paper>
    );
}

function CompactRatings({ ratings }: { ratings: NormalizedRating[] }) {
    return (
        <Stack gap="sm" data-testid="ratings-bars">
            {ratings.map((rating) => (
                <Box key={rating.source}>
                    <Group justify="space-between" gap="xs" mb={4}>
                        <Text fz="xs" c="dimmed">{rating.sourceLabel}</Text>
                        <Text fz="xs" fw={700}>{rating.displayScore}/10</Text>
                    </Group>
                    <Progress
                        value={rating.normalized * 10}
                        color="primaryRed"
                        size="sm"
                        radius="xl"
                        aria-label={`${rating.sourceLabel}: ${rating.displayScore} de 10`}
                    />
                </Box>
            ))}
        </Stack>
    );
}

export default function GameRatingsChart({ ratings }: GameRatingsChartProps) {
    const { colorScheme } = useMantineColorScheme();
    const dark = colorScheme === 'dark';
    const normalized = normalizeRatings(ratings);

    if (normalized.length === 0) return null;
    if (normalized.length < 3) return <CompactRatings ratings={normalized} />;

    const accessibleSummary = normalized
        .map((rating) => `${rating.sourceLabel}: ${rating.displayScore} de 10`)
        .join('. ');
    const gridColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(31,41,55,0.18)';
    const layout = normalized.length === 3
        ? { cy: '58%', outerRadius: '88%' }
        : normalized.length === 4
            ? { cy: '50%', outerRadius: '78%' }
            : { cy: '54%', outerRadius: '84%' };

    return (
        <Box
            h={240}
            data-testid="ratings-radar"
            role="img"
            aria-label={`Calificaciones normalizadas. ${accessibleSummary}`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={normalized} cy={layout.cy} outerRadius={layout.outerRadius}>
                    <PolarGrid stroke={gridColor} />
                    <PolarAngleAxis
                        dataKey="axisLabel"
                        tick={(props) => <RatingAxisTick {...props} />}
                        tickLine={false}
                    />
                    <PolarRadiusAxis
                        domain={[0, 10]}
                        tickCount={6}
                        tick={false}
                        axisLine={false}
                    />
                    <Tooltip content={<RatingTooltip dark={dark} />} />
                    <Radar
                        name="Calificación"
                        dataKey="normalized"
                        stroke="var(--mantine-color-primaryRed-5)"
                        strokeWidth={2}
                        fill="var(--mantine-color-primaryRed-5)"
                        fillOpacity={0.25}
                        dot={{ r: 3, fill: 'var(--mantine-color-primaryRed-5)', fillOpacity: 1 }}
                        animationDuration={500}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </Box>
    );
}
