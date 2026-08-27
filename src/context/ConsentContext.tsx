'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
    CONSENT_COOKIE,
    VISITOR_COOKIE,
    type ConsentChoice,
    type ConsentState,
    parseConsent,
    readCookie,
} from '@/lib/consent';
import { setMeasurementEnabled, setVisitorToken } from '@/lib/api';

interface ConsentContextValue {
    /** `null` mientras no se ha decidido: es cuando se muestra el banner. */
    consent: ConsentState | null;
    /** `false` durante el primer render del servidor, para no parpadear. */
    ready: boolean;
    decide: (choice: ConsentChoice) => Promise<void>;
    /** Derecho de supresión: borra los datos del visitante y sus cookies. */
    forget: () => Promise<boolean>;
}

const ConsentContext = createContext<ConsentContextValue>({
    consent: null,
    ready: false,
    decide: async () => {},
    forget: async () => false,
});

export function ConsentProvider({ children }: { children: React.ReactNode }) {
    const [consent, setConsent] = useState<ConsentState | null>(null);
    const [ready, setReady] = useState(false);

    // La cookie se lee tras montar y no durante el render: en el servidor no
    // existe `document`, y leerla en ambos lados daría marcados distintos.
    useEffect(() => {
        const stored = parseConsent(readCookie(CONSENT_COOKIE));
        setConsent(stored);
        setVisitorToken(readCookie(VISITOR_COOKIE));
        // Sin decisión previa se mide en el nivel anónimo, que es el que la
        // política declara como base por defecto. Solo el opt-out explícito
        // de /cookies lo apaga.
        setMeasurementEnabled(stored ? stored.measure : true);
        setReady(true);
    }, []);

    const decide = useCallback(async (choice: ConsentChoice) => {
        const response = await fetch('/api/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ choice, method: consent ? 'settings' : 'banner' }),
        });
        if (!response.ok) return;
        const data = await response.json();
        const next = data.consent as ConsentState;
        setConsent(next);
        // Se toma del cuerpo y no de la cookie recién puesta: el navegador aún
        // podría no haberla expuesto a `document.cookie`, y el siguiente evento
        // se perdería el identificador.
        setVisitorToken(data.visitorId ?? null);
        setMeasurementEnabled(next.measure);
    }, [consent]);

    const forget = useCallback(async () => {
        const response = await fetch('/api/consent', { method: 'DELETE' });
        setConsent(null);
        setVisitorToken(null);
        // Al olvidar se vuelve al estado de primera visita: el banner reaparece
        // y hasta que decida de nuevo se mide solo en el nivel anónimo.
        setMeasurementEnabled(true);
        return response.ok;
    }, []);

    const value = useMemo(
        () => ({ consent, ready, decide, forget }),
        [consent, ready, decide, forget],
    );

    return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
    return useContext(ConsentContext);
}
