'use client';

import { Box } from '@mantine/core';
import { onDark, sellerAvatarColors } from '@/lib/colors';
import type { Seller } from '@/lib/types';

/** Store mark of an offer row: favicon → logo → initials on a rotating color. */
export default function SellerLogo({ seller, index = 0, size = 40 }: {
    seller: Pick<Seller, 'name' | 'logo' | 'favicon'>;
    /** Position in the list; picks the initials background so neighbours differ. */
    index?: number;
    size?: number;
}) {
    const image = seller.favicon || seller.logo;
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
                // Store logos are tiny remote icons; the optimizer adds nothing.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={image}
                    alt={seller.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                    onError={(e) => {
                        if (seller.logo && e.currentTarget.src !== seller.logo) {
                            e.currentTarget.src = seller.logo;
                        } else {
                            e.currentTarget.style.display = 'none';
                        }
                    }}
                />
            ) : (
                seller.name.slice(0, 2).toUpperCase()
            )}
        </Box>
    );
}
