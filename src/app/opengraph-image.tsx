import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/seo';
import { og } from '@/lib/colors';

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Branded default social-share card used by any route that doesn't set its own image.
export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${og.gradient.from} 0%, ${og.gradient.via} 55%, ${og.gradient.to} 100%)`,
                    color: 'white',
                    fontFamily: 'sans-serif',
                    padding: 80,
                }}
            >
                <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>
                    PLAY<span style={{ color: '#f02f68' }}> IN </span>ONE
                </div>
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 800,
                        textAlign: 'center',
                        marginTop: 24,
                        lineHeight: 1.1,
                    }}
                >
                    Compara precios de videojuegos
                </div>
                <div style={{ fontSize: 36, marginTop: 24, color: '#cbd5e1', textAlign: 'center' }}>
                    Las mejores ofertas entre tiendas chilenas 🇨🇱
                </div>
            </div>
        ),
        { ...size },
    );
}
