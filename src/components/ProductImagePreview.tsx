'use client';

import { useState } from 'react';
import { Box, Center, Loader, Text, type HoverCardProps } from '@mantine/core';

/** HoverCard settings of a store photo preview next to an offer row: it slides
 *  in from the row's left, shared by the game and console pages. */
export const PRODUCT_PREVIEW_HOVER = {
    width: 240,
    position: 'left',
    offset: 12,
    openDelay: 120,
    closeDelay: 80,
    withArrow: true,
    shadow: 'lg',
    radius: 'md',
    transitionProps: {
        transition: {
            in: { opacity: 1, transform: 'translateX(0) scale(1)' },
            out: { opacity: 0, transform: 'translateX(14px) scale(0.86)' },
            common: { transformOrigin: 'right center' },
            transitionProperty: 'opacity, transform',
        },
        duration: 190,
        exitDuration: 120,
        timingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    },
} satisfies Partial<HoverCardProps>;

/** The store's own photo of an offer, loaded only when its preview opens. */
export default function ProductImagePreview({ src, title }: { src: string; title: string }) {
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    return (
        <Box
            h={260}
            pos="relative"
            style={{
                overflow: 'hidden',
                borderRadius: 'var(--mantine-radius-sm)',
                background: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
            }}
        >
            {loading && !failed && (
                <Center pos="absolute" inset={0}>
                    <Loader size="sm" color="primaryRed" />
                </Center>
            )}
            {failed ? (
                <Center h="100%">
                    <Text fz="xs" c="dimmed">Imagen no disponible</Text>
                </Center>
            ) : (
                // A store photo opened on demand at its own size: the optimizer would only add a hop.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={`Vista previa de ${title}`}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setFailed(true);
                    }}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: loading ? 0 : 1,
                        transform: loading ? 'scale(0.98)' : 'scale(1)',
                        transition: 'opacity 180ms ease, transform 180ms ease',
                    }}
                />
            )}
        </Box>
    );
}
