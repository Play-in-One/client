import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from './providers';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import PageViewTracker from '@/components/PageViewTracker';
import { CookieBanner } from '@/components/CookieBanner';
import { SITE_URL, siteConfig, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import './globals.css';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700', '800'],
    display: 'swap',
    variable: '--font-poppins',
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: siteConfig.title,
        template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    keywords: [...siteConfig.keywords],
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    alternates: { canonical: '/' },
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
        type: 'website',
        siteName: siteConfig.name,
        locale: siteConfig.locale,
        url: SITE_URL,
        title: siteConfig.title,
        description: siteConfig.description,
    },
    twitter: {
        card: 'summary_large_image',
        title: siteConfig.title,
        description: siteConfig.description,
    },
    icons: {
        icon: [
            { url: '/PIO-punto-negro.svg', media: '(prefers-color-scheme: light)' },
            { url: '/PIO.svg', media: '(prefers-color-scheme: dark)' },
        ],
        apple: '/PIO.png',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={poppins.variable} suppressHydrationWarning>
            <head>
                <ColorSchemeScript defaultColorScheme="auto" />
            </head>
            <body>
                <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
                <Providers>
                    <AppProvider>
                        <PageViewTracker />
                        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                            <Navbar />
                            <main style={{ flex: 1 }}>
                                {children}
                            </main>
                            <Footer />
                        </div>
                        <CookieBanner />
                    </AppProvider>
                </Providers>
            </body>
        </html>
    );
}
