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
// En mobile el logo comparte la fila de arriba con el gauge, no con las
// carátulas: puede ser más ancho y tiene que ser más bajo.
const LOGO_HEIGHT_MOBILE = 72;
const LOGO_MAX_WIDTH_MOBILE = 200;
// Alto de la fila de carátulas en mobile (`.saga-card__covers` en
// globals.css): 96px de alto dan 72px de ancho, 4 caben en un teléfono de
// 390px y 3 en uno de 360px.
const COVER_HEIGHT_MOBILE = 96;
const GAUGE_SIZE = 100;
const COVER_SLOTS = 4;
const COVER_PLACEHOLDER = '/placeholder-game.png';

/** Tarjeta de `/sagas`. Desde `sm`, una fila de alto fijo: logo a la
 *  izquierda —ajustado al alto de la tarjeta, no a su ancho configurado en el
 *  admin—, carátulas de sus juegos al centro (formato 3:4, el mismo de
 *  siempre en `GameCard`/`FeaturedGameCard`; sin el nombre de la saga, que
 *  ya identifica el logo) y el promedio de calificación a la derecha. En
 *  mobile, dos filas: logo y gauge arriba, carátulas a todo el ancho abajo.
 *  En los dos casos se muestran hasta 4 carátulas, las que quepan: el reparto
 *  lo hace el CSS de `.saga-card` (globals.css), sin medir nada en JS. */
export default function SagaCard({ saga }: { saga: Saga }) {
    // Un slot por carátula pedida, aunque la saga traiga menos de 4: el
    // placeholder rellena el resto para que la fila no quede descuadrada.
    // Igual que GameCard/FeaturedGameCard, el fallo de carga se guarda por
    // índice y cae al mismo placeholder que el resto del catálogo.
    const [failed, setFailed] = useState<Record<number, boolean>>({});
    const covers = Array.from({ length: COVER_SLOTS }, (_, i) => saga.game_covers?.[i] ?? null);

    return (
        <Anchor component={Link} href={`/saga/${saga.slug}`} underline="never">
            <Card
                withBorder
                shadow="sm"
                radius="lg"
                py="md"
                px={{ base: 'md', sm: 'xl' }}
                h={{ base: 'auto', sm: CARD_HEIGHT }}
                style={{ cursor: 'pointer' }}
            >
                <Box className="saga-card">
                    <Box className="saga-card__logo">
                        {/* Dos instancias en vez de una responsive: SagaLogo
                            fija su alto en px inline. Solo una se pinta; la
                            otra queda en display:none y, al ser lazy, ni se
                            descarga. */}
                        {saga.logo && (
                            <>
                                <Box hiddenFrom="sm">
                                    <SagaLogo saga={saga} height={LOGO_HEIGHT_MOBILE} maxWidth={LOGO_MAX_WIDTH_MOBILE} />
                                </Box>
                                <Box visibleFrom="sm">
                                    <SagaLogo saga={saga} height={CONTENT_HEIGHT} maxWidth={LOGO_MAX_WIDTH} />
                                </Box>
                            </>
                        )}
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
                                    sizes={`(max-width: 48em) ${Math.round(COVER_HEIGHT_MOBILE * (3 / 4))}px, ${Math.round(CONTENT_HEIGHT * (3 / 4))}px`}
                                    unoptimized
                                    style={{ objectFit: 'cover' }}
                                    onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
                                />
                            </Box>
                        ))}
                    </Box>
                    <Box style={{ flexShrink: 0 }}>
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
