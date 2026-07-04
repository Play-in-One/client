/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8001',
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
