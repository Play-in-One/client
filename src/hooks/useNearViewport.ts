import { useEffect, useRef, useState } from 'react';

/** SSR and hydration use the same placeholder, with space reserved by the caller. */
export function useNearViewport() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!('IntersectionObserver' in window)) { setVisible(true); return; }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
        }, { rootMargin: '300px' });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return { ref, visible };
}
