import Image from 'next/image';
import { Box, Text } from '@mantine/core';
import type { Saga } from '@/lib/types';

const DEFAULT_WIDTH = 140;

/**
 * Logo de una saga con el ancho que se configura en el admin
 * (`Saga.logo_width`); el alto sale de la proporción de la imagen, así que
 * nunca se deforma ni se recorta. `scale` agranda el mismo ancho (la cabecera
 * de la ficha lo muestra más grande que las tarjetas).
 *
 * `height` es solo una referencia que exige next/image sin `fill`: el
 * `height: auto` del estilo la pisa con la proporción real.
 *
 * Sin logo cargado muestra el nombre: next/image revienta con un `src` vacío.
 */
export default function SagaLogo({
    saga,
    scale = 1,
    priority,
    height,
    maxWidth,
}: {
    saga: Pick<Saga, 'logo' | 'name' | 'logo_width'>;
    scale?: number;
    priority?: boolean;
    /** Si se pasa, el logo se dimensiona por ALTO fijo en vez de por
     *  `logo_width` (para llenar un contenedor de alto fijo, como la tarjeta
     *  de `/sagas`); el ancho sale de la proporción real de la imagen, mismo
     *  mecanismo que el modo por ancho pero con los ejes invertidos. */
    height?: number;
    /** Ancho máximo en px, solo junto a `height`: topa los logos muy
     *  panorámicos para que no se coman el espacio de las carátulas. Usa
     *  `object-fit: contain` (nunca recorta ni deforma) dentro de una caja de
     *  tamaño fijo, así que un logo angosto queda con aire a los costados en
     *  vez de forzarse al ancho máximo. */
    maxWidth?: number;
}) {
    if (!saga.logo) {
        return <Text fw={700} ta="center">{saga.name}</Text>;
    }
    if (height != null) {
        const width = maxWidth ?? Math.round(height / 0.4);
        return (
            <Box pos="relative" style={{ height, width, maxWidth: '100%' }}>
                <Image
                    src={saga.logo}
                    alt={`Logo de ${saga.name}`}
                    fill
                    priority={priority}
                    style={{ objectFit: 'contain' }}
                />
            </Box>
        );
    }
    const width = Math.round((saga.logo_width ?? DEFAULT_WIDTH) * scale);
    return (
        <Image
            src={saga.logo}
            alt={`Logo de ${saga.name}`}
            width={width}
            height={Math.round(width * 0.4)}
            priority={priority}
            style={{ width, maxWidth: '100%', height: 'auto', display: 'block' }}
        />
    );
}
