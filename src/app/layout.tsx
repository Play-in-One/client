import type { Metadata } from 'next';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { theme } from '@/theme';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL, siteConfig, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import './globals.css';

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
        icon: '/PIO.png',
        apple: '/PIO.png',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <ColorSchemeScript defaultColorScheme="auto" />
            </head>
            <body>
                <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
                <MantineProvider theme={theme} defaultColorScheme="auto">
                    <AppProvider>
                        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                            <Navbar />
                            <main style={{ flex: 1 }}>
                                {children}
                            </main>
                            <Footer />
                        </div>
                    </AppProvider>
                </MantineProvider>
            </body>
        </html>
    );
}
