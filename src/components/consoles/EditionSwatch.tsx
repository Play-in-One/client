import { editionSwatch } from '@/lib/consoles';
import styles from './ConsoleCatalog.module.css';

/** A dot of the colour of a colour edition; nothing for any other edition. */
export function EditionSwatch({ editionKey, size = 12 }: { editionKey?: string | null; size?: number }) {
    const background = editionSwatch(editionKey);
    if (!background) return null;
    return <span className={styles.swatch} style={{ background, width: size, height: size }} aria-hidden data-edition-swatch={editionKey} />;
}
