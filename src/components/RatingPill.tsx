'use client';

import { Text, type BoxProps, type MantineStyleProp } from '@mantine/core';
import { IconStarFilled } from '@tabler/icons-react';
import { ratingColor } from '@/lib/colors';
import CoverChip from './CoverChip';

/** Nota (0-10) sobre una portada: velo oscuro, estrella con el color de la nota
 *  y número en blanco. La estrella usa el tono 4 y no el 5 de `RatingGauge`:
 *  el velo deja pasar la foto, y sobre una portada clara el rojo del tono 5
 *  quedaba en 2,5:1 frente al fondo, bajo el 3:1 que pide un icono. Con el 4
 *  ninguna nota baja de 3:1 en el peor caso (portada blanca). */
export default function RatingPill({ value, style, ...others }: { value: number; style?: MantineStyleProp } & BoxProps) {
    return (
        <CoverChip strength="strong" px="2xs" py={2} {...others} style={[{ gap: 4 }, style]}>
            {/* 10 y no 12: la estrella de 12 medía 10,5 px frente a los 8 px de
                las cifras de 11 px y se veía descolgada. Con 10 queda 1,1 veces
                el alto de las cifras, la misma proporción que la estrella de la
                tarjeta destacada (14 junto a texto de 14 px). */}
            <IconStarFilled size={10} color={`var(--mantine-color-${ratingColor(value)}-4)`} />
            <Text fz={11} fw={700} c="inherit">
                {value.toFixed(1)}
            </Text>
        </CoverChip>
    );
}
