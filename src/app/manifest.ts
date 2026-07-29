import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: `${siteConfig.name} — Comparador de precios de videojuegos`,
        short_name: siteConfig.shortName,
        description: siteConfig.description,
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#E63946',
        lang: 'es-CL',
        icons: [
            { src: '/PIO.png', sizes: 'any', type: 'image/png' },
        ],
    };
}
