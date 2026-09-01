import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ApiError, getGame } from '@/lib/api';
import type { Game } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata, gameJsonLd, breadcrumbJsonLd, faqJsonLd, bestPriceSentence } from '@/lib/seo';
import { buildGameFaq } from '@/lib/gameFaq';
import FaqSection from '@/components/FaqSection';
import { PREFS_COOKIE, parsePrefs } from '@/lib/prefs';
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
    // La frase del precio va PRIMERO y la descripción editorial después: es el
    // dato que resuelve la búsqueda ("¿cuánto cuesta X?") y el que un motor
    // generativo cita. Sin oferta se cae a la descripción de siempre.
    const description =
        bestPriceSentence(game) ||
        game.description?.trim() ||
        `Compara precios de ${game.name}${platforms ? ` para ${platforms}` : ''} entre tiendas chilenas en Play in One.`;

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

    /* Los filtros globales se leen de la cookie y viajan como props: así el
       HTML sale ya filtrado y no hay nada que corregir tras hidratar, que es lo
       que hacía parpadear las ofertas de tiendas internacionales.
       `cookies()` deja esta ruta fuera del prerender estático — aquí no cuesta
       nada porque `getGame` ya se resuelve en cada petición, pero conviene
       saberlo antes de intentar cachearla. */
    const prefs = parsePrefs((await cookies()).get(PREFS_COOKIE)?.value);

    const faq = buildGameFaq(game);
    const jsonLd = [
        gameJsonLd(game),
        breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Juegos', path: '/search' },
            { name: game.name, path: `/game/${game.id}` },
        ]),
        ...(faq.length ? [faqJsonLd(faq, `/game/${game.id}`)] : []),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <Suspense fallback={null}>
                <GameDetailClient initialGame={game} initialPrefs={prefs} />
            </Suspense>
            <FaqSection
                entries={faq}
                title={`Preguntas frecuentes sobre ${game.name}`}
                collapsible
                /* 'lg' como el Container de GameDetailClient: con el 'xl' por
                   defecto la sección se salía por la izquierda del resto. */
                size="lg"
            />
        </>
    );
}
