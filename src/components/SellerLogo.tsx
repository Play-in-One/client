'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Box } from '@mantine/core';
import { onDark, sellerAvatarColors } from '@/lib/colors';
import type { Seller } from '@/lib/types';

/** Store mark of an offer row: favicon → logo → initials on a rotating color. */
export default function SellerLogo({ seller, index = 0, size = 40 }: {
    seller: Pick<Seller, 'name'> & Partial<Pick<Seller, 'logo' | 'favicon'>>;
    /** Position in the list; picks the initials background so neighbours differ. */
    index?: number;
    size?: number;
}) {
    const [failed, setFailed] = useState<string[]>([]);
    const image = [seller.favicon, seller.logo].find((src) => src && !failed.includes(src));
    return (
        <Box
            w={size}
            h={size}
            style={{
                borderRadius: 'var(--mantine-radius-sm)',
                /* Con logo, fondo neutro: el color se vería a través de uno transparente. */
                background: image
                    ? 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))'
                    : sellerAvatarColors[index % sellerAvatarColors.length],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 'var(--mantine-font-size-xs)',
                color: onDark.text,
                flexShrink: 0,
                overflow: 'hidden',
            }}
        >
            {image ? (
                <Image src={image!} alt="" width={size} height={size} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                    onError={() => setFailed((previous) => [...previous, image!])} />
            ) : (
                seller.name.slice(0, 2).toUpperCase()
            )}
        </Box>
    );
}
