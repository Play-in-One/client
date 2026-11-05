'use client';

import Link from 'next/link';
import { Tooltip } from '@mantine/core';
import { IconDeviceGamepad2 } from '@tabler/icons-react';
import RemoteImage from '@/components/RemoteImage';
import { GAME_FORMATS, type ConsoleGame } from '@/lib/consoles';
import { gamePath } from '@/lib/seo';
import styles from './ConsoleCatalog.module.css';

function label(game: ConsoleGame) {
    return game.format === 'unknown' ? game.title : `${game.title} · ${GAME_FORMATS[game.format]}`;
}

/** The box art of the games a pack includes. A game linked to the catalog
 *  shows its cover and opens its page; an unlinked one keeps a neutral tile
 *  with its title in the tooltip, never another game's cover. */
export function IncludedGameCovers({ games, size = 'md' }: { games: ConsoleGame[]; size?: 'sm' | 'md' }) {
    if (!games.length) return null;
    return (
        <div className={styles.covers} data-size={size} data-included-games>
            {games.map((game, i) => {
                const tile = game.cover
                    ? <RemoteImage src={game.cover} alt={game.title} sizes="64px" style={{ objectFit: 'cover' }} />
                    : <span className={styles.coverEmpty} aria-hidden><IconDeviceGamepad2 size={18} /></span>;
                return (
                    <Tooltip key={`${game.title}-${i}`} label={label(game)} withinPortal>
                        {game.game
                            ? <Link href={gamePath({ id: game.game, slug: game.slug })} className={styles.cover} aria-label={label(game)}
                                data-included-game>{tile}</Link>
                            : <span className={styles.cover} role="img" aria-label={label(game)} data-included-game>{tile}</span>}
                    </Tooltip>
                );
            })}
        </div>
    );
}
