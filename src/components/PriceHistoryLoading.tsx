'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PriceHistoryLoading.module.css';

/** Shared SVG + CSS: shipped with the detail bundle and cached by Next's
 * versioned static assets, rather than fetched or generated for each game. */
export default function PriceHistoryLoading() {
    const ref = useRef<HTMLDivElement>(null);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        let inView = !('IntersectionObserver' in window);
        const update = () => setRunning(inView && !document.hidden);
        const observer = 'IntersectionObserver' in window
            ? new IntersectionObserver(([entry]) => {
                inView = entry.isIntersecting;
                update();
            })
            : null;

        if (ref.current) observer?.observe(ref.current);
        document.addEventListener('visibilitychange', update);
        update();
        return () => {
            observer?.disconnect();
            document.removeEventListener('visibilitychange', update);
        };
    }, []);

    return (
        <div ref={ref} className={styles.root} data-running={running} role="status" aria-live="polite" aria-label="Buscando y calculando el historial de precios">
            <svg className={styles.illustration} viewBox="0 0 320 240" aria-hidden="true" focusable="false">
                <path className={styles.connections} d="m74 61 86 51 86-51M160 170v-58" />
                <g className={styles.source}>
                    <rect className={styles.sourceTile} x="46" y="35" width="48" height="48" rx="14" />
                    <path className={styles.store} d="M58 54h24l-3-8H61l-3 8v16h24V54M65 70V60h10v10" />
                    <path className={styles.store} d="M58 54c0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0" />
                </g>
                <g className={`${styles.source} ${styles.sourceTwo}`}>
                    <rect className={styles.sourceTile} x="226" y="35" width="48" height="48" rx="14" />
                    <path className={styles.store} d="M238 54h24l-3-8h-18l-3 8v16h24V54M245 70V60h10v10" />
                    <path className={styles.store} d="M238 54c0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0" />
                </g>
                <g className={`${styles.source} ${styles.sourceThree}`}>
                    <rect className={styles.sourceTile} x="136" y="168" width="48" height="48" rx="14" />
                    <path className={styles.store} d="M148 187h24l-3-8h-18l-3 8v16h24v-16M155 203v-10h10v10" />
                    <path className={styles.store} d="M148 187c0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0" />
                </g>
                <circle className={`${styles.packet} ${styles.packetOne}`} cx="74" cy="61" r="4" />
                <circle className={`${styles.packet} ${styles.packetTwo}`} cx="246" cy="61" r="4" />
                <circle className={`${styles.packet} ${styles.packetThree}`} cx="160" cy="170" r="4" />
                <g className={styles.hub}>
                    <rect className={styles.hubTile} x="125" y="77" width="70" height="70" rx="21" />
                    <rect className={styles.bar} x="140" y="110" width="8" height="20" rx="3" />
                    <rect className={`${styles.bar} ${styles.barTwo}`} x="156" y="101" width="8" height="29" rx="3" />
                    <rect className={`${styles.bar} ${styles.barThree}`} x="172" y="92" width="8" height="38" rx="3" />
                </g>
            </svg>
        </div>
    );
}
