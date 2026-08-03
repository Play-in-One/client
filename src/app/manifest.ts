import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';
import { pwa } from '@/lib/colors';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: `${siteConfig.name} — Comparador de precios de videojuegos`,
        short_name: siteConfig.shortName,
        description: siteConfig.description,
        start_url: '/',
        display: 'standalone',
        background_color: pwa.backgroundColor,
        theme_color: pwa.themeColor,
        lang: 'es-CL',
        icons: [
            { src: '/PIO-punto-negro.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
    };
}
