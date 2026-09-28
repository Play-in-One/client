'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

import { useConsent } from '@/context/ConsentContext';

/* Google Analytics 4, SOLO para quien aceptó la cookie de medición.

   Convive con la analítica propia (`trackEvent` → /api/events/), no la
   reemplaza. La propia cubre a todo el mundo, porque mide sin cookie a quien
   no acepta. GA4 solo ve a quien acepta, a cambio del informe de Adquisición
   y del enlace con Google Ads. Por eso sus cifras siempre salen más bajas que
   las del panel de /staff/analytics, y es lo esperable.

   El script no se carga hasta que hay consentimiento: nada de "cargar con
   Consent Mode en denied y esperar". Consent Mode sin consentimiento sigue
   enviando pings sin cookie a Google, y la política no lo declara. Si alguien
   revoca en /cookies con la página abierta, el script ya cargado no se puede
   descargar. Se apaga con la bandera oficial `ga-disable-<ID>`, y en la
   siguiente carga ya no se inyecta. */

const RAW_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
/* Se interpola dentro de un <script> inline: solo pasa un ID con la forma real. */
export const GA_MEASUREMENT_ID = /^G-[A-Z0-9]{4,20}$/.test(RAW_ID) ? RAW_ID : '';

// Rutas de administración: tráfico propio, igual que en PageViewTracker.
const EXCLUDED = ['/staff'];

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        [key: `ga-disable-${string}`]: boolean | undefined;
    }
}

export default function GoogleAnalytics() {
    const { consent, ready } = useConsent();
    const pathname = usePathname() ?? '';
    const granted = ready && consent?.analytics === true;
    const excluded = EXCLUDED.some((prefix) => pathname.startsWith(prefix));
    const adsGranted = consent?.ads === true;

    // GA4 mide los cambios de ruta del SPA por su cuenta (medición mejorada,
    // "history events"). Esta bandera es lo único que lo detiene tras una
    // revocación, o al entrar a /staff desde el sitio con el script ya cargado.
    useEffect(() => {
        if (!GA_MEASUREMENT_ID) return;
        window[`ga-disable-${GA_MEASUREMENT_ID}`] = !granted || excluded;
        window.gtag?.('consent', 'update', {
            analytics_storage: granted ? 'granted' : 'denied',
            ad_user_data: granted && adsGranted ? 'granted' : 'denied',
            ad_personalization: granted && adsGranted ? 'granted' : 'denied',
        });
    }, [granted, excluded, adsGranted]);

    if (!GA_MEASUREMENT_ID || !granted || excluded) return null;

    const ads = adsGranted ? 'granted' : 'denied';
    return (
        <>
            <Script id="ga-init" strategy="afterInteractive">
                {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;` +
                    `gtag('consent','default',{analytics_storage:'granted',ad_storage:'${ads}',ad_user_data:'${ads}',ad_personalization:'${ads}'});` +
                    `gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
            </Script>
            <Script
                id="ga-lib"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
        </>
    );
}
