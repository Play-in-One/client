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
    experimental: {
        // Reduce el barrel de estas librerías en el bundle (tree-shaking dirigido).
        optimizePackageImports: ['@mantine/core', '@tabler/icons-react'],
    },
};

export default nextConfig;
