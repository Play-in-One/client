import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/seo';
import { brand, darkScale, decorative, onDark } from '@/lib/colors';

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Branded default social-share card used by any route that doesn't set its own image.
export default async function OpengraphImage() {
    // Local assets keep the card independent of the API and external font hosts.
    // Explicit paths also let Next include them in the standalone output trace.
    const [logo, poppinsRegular, poppinsExtraBold, figtreeExtraBold] = await Promise.all([
        readFile(join(process.cwd(), 'public/PIO.svg')),
        readFile(join(process.cwd(), 'public/fonts/social/Poppins-Regular.ttf')),
        readFile(join(process.cwd(), 'public/fonts/social/Poppins-ExtraBold.ttf')),
        readFile(join(process.cwd(), 'public/fonts/social/Figtree-ExtraBold.ttf')),
    ]);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    background: darkScale[7],
                    color: onDark.text,
                    fontFamily: 'Poppins',
                    padding: 64,
                }}
            >
                {/* Soft halos echo the homepage hero without CSS blur filters. */}
                <div style={{
                    position: 'absolute', top: -320, right: -240, width: 1000, height: 1000,
                    background: `radial-gradient(circle, ${decorative.heroBlobRed} 0%, transparent 70%)`,
                }} />
                <div style={{
                    position: 'absolute', bottom: -400, left: -280, width: 1000, height: 1000,
                    background: `radial-gradient(circle, ${decorative.heroBlobBlue} 0%, transparent 70%)`,
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                    {/* ImageResponse embeds this asset; next/image is for browser pages. */}
                    <img
                        src={`data:image/svg+xml;base64,${logo.toString('base64')}`}
                        width={76}
                        height={93}
                        alt=""
                    />
                    <div style={{
                        display: 'flex', fontFamily: 'Figtree', fontSize: 52,
                        fontWeight: 800, letterSpacing: '-0.02em',
                    }}>
                        Play<span style={{ color: brand.primary }}>in</span>One
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        fontSize: 62,
                        fontWeight: 800,
                        textAlign: 'center',
                        marginTop: 42,
                        lineHeight: 1.18,
                        letterSpacing: '-0.035em',
                    }}
                >
                    <span>Encuentra tu próximo juego</span>
                    <span style={{ color: brand.primary, fontSize: 80 }}>al mejor precio</span>
                </div>
                <div style={{ fontSize: 30, marginTop: 24, color: darkScale[1], textAlign: 'center' }}>
                    Compara precios entre tiendas chilenas
                </div>
                <div style={{ fontSize: 28, marginTop: 'auto', color: darkScale[0] }}>
                    playinone.cl
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                { name: 'Poppins', data: poppinsRegular, weight: 400, style: 'normal' },
                { name: 'Poppins', data: poppinsExtraBold, weight: 800, style: 'normal' },
                { name: 'Figtree', data: figtreeExtraBold, weight: 800, style: 'normal' },
            ],
        },
    );
}
