'use client';

import { useEffect, useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconBookmark, IconBookmarkFilled, IconCheck, IconLink, IconShare } from '@tabler/icons-react';
import { useApp } from '@/context/AppContext';
import { trackEvent } from '@/lib/api';
import { gamePath } from '@/lib/seo';

/**
 * Guardar y compartir, junto al título de la ficha.
 *
 * Solo necesitan el id, el nombre y el slug, que ya tiene la tarjeta clicada
 * (semilla), el preview del servidor y la ficha completa. Por eso viven aquí y
 * los pintan TODAS las fases con el mismo comportamiento: antes las fases
 * previas mostraban dos círculos en esqueleto que tardaban en convertirse en
 * los mismos dos botones de siempre. Sin juego todavía (el esqueleto sin
 * semilla de una carga directa) salen igual, deshabilitados.
 */
export default function GameActions({ game }: { game: { id: number; name: string; slug?: string | null } | null }) {
    const { isSaved, toggleSaved } = useApp();
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    useEffect(() => {
        setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const saved = game ? isSaved(game.id) : false;

    const handleToggleSave = () => {
        if (!game) return;
        toggleSaved(game.id);
        // Solo la acción de guardar (no la de quitar): popularidad de guardados.
        if (!saved) trackEvent({ event_type: 'game_save', game: game.id });
    };

    const handleShare = async () => {
        if (!game) return;
        const shareUrl = `${window.location.origin}${gamePath(game)}`;
        const shareData = { title: game.name, text: `Mira el precio de ${game.name} en PlayInOne`, url: shareUrl };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // user cancelled the share sheet
            }
        } else if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // clipboard write blocked
            }
        }
    };

    const shareLabel = copied ? 'Enlace copiado' : canNativeShare ? 'Compartir' : 'Copiar enlace';
    return <>
        <ActionIcon
            variant={saved ? 'filled' : 'default'}
            color={saved ? 'primaryRed' : undefined}
            size="lg"
            radius="xl"
            onClick={handleToggleSave}
            disabled={!game}
            aria-label={saved ? 'Quitar de guardados' : 'Guardar juego'}
        >
            {saved ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
        </ActionIcon>
        <Tooltip label={copied ? '¡Enlace copiado!' : shareLabel}>
            <ActionIcon variant="default" size="lg" radius="xl" onClick={handleShare} disabled={!game} aria-label={shareLabel}>
                {copied ? <IconCheck size={18} /> : canNativeShare ? <IconShare size={18} /> : <IconLink size={18} />}
            </ActionIcon>
        </Tooltip>
    </>;
}
