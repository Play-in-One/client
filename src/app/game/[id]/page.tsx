import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError, getGame } from '@/lib/api';
import type { Game } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, gameJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { formatCLP } from '@/lib/utils';
import GameDetailClient from './GameDetailClient';

async function fetchGame(id: string): Promise<Game | null> {
    try {
        return await getGame(id);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        // Non-404 errors (network failure, 5xx, misconfigured API URL) are not
        // "game doesn't exist" — surface them instead of silently rendering notFound().
        console.error(`Failed to fetch game ${id}:`, err);
        throw err;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const game = await fetchGame(id);
    if (!game) return buildMetadata({ title: 'Juego no encontrado', noIndex: true });

    const platforms = game.platforms.map((p) => p.display_name).join(', ');
    const priceLabel = game.min_price ? ` desde ${formatCLP(Number(game.min_price))}` : '';
    const description =
        game.description?.trim() ||
        `Compara precios de ${game.name}${platforms ? ` para ${platforms}` : ''}${priceLabel} entre tiendas chilenas en Play in One.`;

    return buildMetadata({
        title: game.name,
        description,
        path: `/game/${game.id}`,
        image: game.image,
    });
}

export default async function GameDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const game = await fetchGame(id);
    if (!game) notFound();

    const jsonLd = [
        gameJsonLd(game),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Juegos', path: '/search' },
            { name: game.name, path: `/game/${game.id}` },
        ]),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <Suspense fallback={null}>
                <GameDetailClient initialGame={game} />
            </Suspense>
        </>
    );
}
