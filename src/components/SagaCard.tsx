'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Anchor, Box, Card, Text } from '@mantine/core';
import type { Saga } from '@/lib/types';
import SagaLogo from './SagaLogo';
import SagaRatingGauge from './SagaRatingGauge';

const CARD_HEIGHT = 168;
// El padding VERTICAL del Card (py="md" = 16px por lado, tema por defecto sin
// override en theme.ts) es lo único que resta del alto de la tarjeta: el
// horizontal (px="xl") no afecta este cálculo.
const CONTENT_HEIGHT = CARD_HEIGHT - 16 * 2;
// Topa los logos muy panorámicos: sin esto, uno angosto de alto (relación de
// aspecto ancha) le comería el espacio a las carátulas.
const LOGO_MAX_WIDTH = 160;
const GAUGE_SIZE = 100;
const COVER_SLOTS = 4;
const COVER_PLACEHOLDER = '/placeholder-game.png';

/** Tarjeta horizontal de alto fijo para `/sagas`: logo a la izquierda —
 *  ajustado al alto de la tarjeta, no a su ancho configurado en el admin—,
 *  hasta 4 carátulas de sus juegos al centro (formato 3:4, el mismo de
 *  siempre en `GameCard`/`FeaturedGameCard`; sin el nombre de la saga, que
 *  ya identifica el logo) y el promedio de calificación a la derecha.
 *
 *  Cuando falta ancho (mobile) la fila no cambia de forma: se van cayendo
 *  las carátulas, una a una, y después el gauge; el logo queda siempre. Lo
 *  resuelve el CSS de `.saga-card` en globals.css, cuyos umbrales salen de
 *  estas constantes. */
export default function SagaCard({ saga }: { saga: Saga }) {
    // Un slot por carátula pedida, aunque la saga traiga menos de 4: el
    // placeholder rellena el resto para que la fila no quede descuadrada.
    // Igual que GameCard/FeaturedGameCard, el fallo de carga se guarda por
    // índice y cae al mismo placeholder que el resto del catálogo.
    const [failed, setFailed] = useState<Record<number, boolean>>({});
    const covers = Array.from({ length: COVER_SLOTS }, (_, i) => saga.game_covers?.[i] ?? null);

    return (
        <Anchor component={Link} href={`/saga/${saga.slug}`} underline="never">
            <Card withBorder shadow="sm" radius="lg" py="md" px="xl" h={CARD_HEIGHT} style={{ cursor: 'pointer' }}>
                <Box className="saga-card">
                    <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        {saga.logo && <SagaLogo saga={saga} height={CONTENT_HEIGHT} maxWidth={LOGO_MAX_WIDTH} />}
                    </Box>
                    <Box className="saga-card__covers" data-testid="saga-card-covers">
                        {covers.map((src, i) => (
                            <Box
                                key={i}
                                pos="relative"
                                style={{
                                    height: '100%',
                                    aspectRatio: '3 / 4',
                                    flexShrink: 0,
                                    borderRadius: 'var(--mantine-radius-md)',
                                    overflow: 'hidden',
                                }}
                            >
                                <Image
                                    src={failed[i] || !src ? COVER_PLACEHOLDER : src}
                                    alt=""
                                    fill
                                    sizes={`${Math.round(CONTENT_HEIGHT * (3 / 4))}px`}
                                    unoptimized
                                    style={{ objectFit: 'cover' }}
                                    onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
                                />
                            </Box>
                        ))}
                    </Box>
                    <Box className="saga-card__gauge">
                        {saga.avg_rating != null ? (
                            <SagaRatingGauge
                                value={saga.avg_rating}
                                testId={`rating-gauge-saga-${saga.slug}`}
                                size={GAUGE_SIZE}
                            />
                        ) : (
                            <Text size="sm" c="dimmed" data-testid={`rating-gauge-saga-${saga.slug}`}>
                                Sin calificación
                            </Text>
                        )}
                    </Box>
                </Box>
            </Card>
        </Anchor>
    );
}
