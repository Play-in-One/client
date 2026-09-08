const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    devIndicators: false,
    images: {
        // Servir AVIF/WebP cuando el navegador lo soporte.
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: apiUrl.protocol.replace(':', ''),
                hostname: apiUrl.hostname,
                port: apiUrl.port,
                pathname: '/media/**',
            },
            {
                protocol: 'http',
                hostname: 'backend',
                port: '8001',
                pathname: '/media/**',
            },
            {
                protocol: 'https',
                hostname: 'pio-backend.onrender.com',
                pathname: '/media/**',
            },
            // Las portadas de juegos/productos son URLs externas de CDNs de las
            // tiendas (cloudfront, cdn de cada seller, etc.), no /media/. Se
            // permite cualquier host https para que next/image pueda optimizarlas.
            { protocol: 'https', hostname: '**' },
        ],
    },
    async redirects() {
        return [
            // `pc` se retiró del catálogo en favor de `win`/`mac`/`linux`, y
            // `/juegos/pc` es una landing que Google ya tenía indexada: sin
            // esto se convierte en un 404. Va en la configuración y no en un
            // `page.tsx` para no pagar un render por cada redirección.
            { source: '/juegos/pc', destination: '/juegos/win', permanent: true },
            {
                source: '/juegos/pc/pagina/:page',
                destination: '/juegos/win/pagina/:page',
                permanent: true,
            },
            // Nintendo DS pasó de `nds` a `ds`, y su landing también estaba
            // indexada.
            { source: '/juegos/nds', destination: '/juegos/ds', permanent: true },
            {
                source: '/juegos/nds/pagina/:page',
                destination: '/juegos/ds/pagina/:page',
                permanent: true,
            },
        ];
    },
    experimental: {
        // Reduce el barrel de estas librerías en el bundle (tree-shaking dirigido).
        optimizePackageImports: ['@mantine/core', '@tabler/icons-react'],
    },
};

export default nextConfig;
