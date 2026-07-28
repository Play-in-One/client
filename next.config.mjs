const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    devIndicators: false,
    images: {
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
        ],
    },
};

export default nextConfig;
