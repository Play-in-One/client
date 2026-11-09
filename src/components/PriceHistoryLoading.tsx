'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './PriceHistoryLoading.module.css';

/** Duración de un ciclo; tiene que coincidir con la de las animaciones del CSS. */
const CYCLE_MS = 4500;

/* useLayoutEffect avisa en el servidor; allí no hay nada que medir. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const STORE_ICON = (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path className={styles.store} d="M12 19h24l-3-8H15l-3 8v16h24V19M19 35V25h10v10" />
        <path className={styles.store} d="M12 19c0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0" />
    </svg>
);

/**
 * Tres tiendas que mandan datos a un gráfico central, mientras llega el
 * historial de precios. Lo comparten el preview, la espera y la tarjeta final
 * (`MinPriceChartFrame`); va con el bundle de la ficha (SVG + CSS), sin pedir
 * nada aparte.
 *
 * Dos decisiones para que no se vea a saltos:
 *
 * 1. Lo que se MUEVE son capas HTML animadas solo con `transform` y `opacity`,
 *    que el navegador compone fuera del hilo principal. La primera versión
 *    animaba elementos SVG, y eso corre en el hilo principal: justo al cargar
 *    la ficha (hidratación, el chunk del gráfico) ese hilo está ocupado y la
 *    animación saltaba cuadros. El SVG queda solo para el fondo estático.
 * 2. Un reloj común. La tarjeta se monta hasta tres veces mientras espera
 *    (preview, espera, tarjeta final) y cada montaje reiniciaba la animación
 *    desde cero. Al montar se adelanta a la fase del reloj del documento
 *    (`performance.now()`), así que un remontaje continúa donde iba.
 */
export default function PriceHistoryLoading() {
    const ref = useRef<HTMLDivElement>(null);
    const [running, setRunning] = useState(true);

    useIsomorphicLayoutEffect(() => {
        // Antes de pintar: el primer cuadro ya está en la fase correcta.
        ref.current?.style.setProperty('--history-offset', `${-(performance.now() % CYCLE_MS)}ms`);
    }, []);

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
        return () => {
            observer?.disconnect();
            document.removeEventListener('visibilitychange', update);
        };
    }, []);

    return (
        <div ref={ref} className={styles.root} data-running={running} role="status" aria-live="polite" aria-label="Buscando y calculando el historial de precios">
            <div className={styles.illustration} aria-hidden="true">
                {/* Fondo estático: las conexiones entre las tiendas y el gráfico. */}
                <svg className={styles.backdrop} viewBox="0 0 320 240" focusable="false">
                    <path className={styles.connections} d="m74 61 86 51 86-51M160 170v-58" />
                </svg>
                <div className={`${styles.source} ${styles.sourceOne}`}>{STORE_ICON}</div>
                <div className={`${styles.source} ${styles.sourceTwo}`}>{STORE_ICON}</div>
                <div className={`${styles.source} ${styles.sourceThree}`}>{STORE_ICON}</div>
                <span className={`${styles.packet} ${styles.packetOne}`} />
                <span className={`${styles.packet} ${styles.packetTwo}`} />
                <span className={`${styles.packet} ${styles.packetThree}`} />
                <div className={styles.hub}>
                    <span className={`${styles.bar} ${styles.barOne}`} />
                    <span className={`${styles.bar} ${styles.barTwo}`} />
                    <span className={`${styles.bar} ${styles.barThree}`} />
                </div>
            </div>
        </div>
    );
}
