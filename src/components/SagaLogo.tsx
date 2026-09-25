import Image from 'next/image';
import { Text } from '@mantine/core';
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
}: {
    saga: Pick<Saga, 'logo' | 'name' | 'logo_width'>;
    scale?: number;
    priority?: boolean;
}) {
    if (!saga.logo) {
        return <Text fw={700} ta="center">{saga.name}</Text>;
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
