'use client';

import { useParams } from 'next/navigation';
import { useSeed } from '@/lib/navigationSeed';
import { parseGameSegment } from '@/lib/seo';
import { GameHeroFrame } from './hero/GameHero';

/* Lo que pinta la ficha mientras el page resuelve el preview.

   No es solo cosmético: es lo que deja al router pintar la ficha antes de que
   el backend responda. Los enlaces a una ficha no se precargan
   (`GAME_LINK_PREFETCH` en `lib/seo.ts`), así que al hacer clic la respuesta
   RSC trae este boundary en cuanto sale el layout y el page llega después, en
   streaming.

   Usa el MISMO marco que el preview y la ficha completa (`hero/GameHero.tsx`):
   el esqueleto anterior era un Flex de dos columnas que no coincidía con
   `.pio-game-layout` en ningún ancho, y la página se reacomodaba dos veces.

   Cliente a propósito: si se llegó desde una tarjeta, lee su semilla
   (`lib/navigationSeed.ts`) y muestra ya la portada, el nombre, las consolas y
   el precio, los mismos que el overlay instantáneo pintó en el clic. En un
   documento no hay semilla y sale el marco entero en esqueleto. */
export default function GameDetailLoading() {
    const params = useParams<{ slug: string }>();
    const id = params?.slug ? parseGameSegment(params.slug)?.id : undefined;
    const seed = useSeed('game', id);
    return <GameHeroFrame data={seed ? {
        id: seed.id,
        name: seed.name,
        slug: seed.slug,
        image: seed.image,
        placeholderSrc: seed.placeholderSrc,
        platforms: seed.platforms,
        selectedPlatform: seed.selectedPlatform,
        price: seed.price?.amount ?? null,
        shipping: seed.price?.shipping ?? null,
        condition: seed.price?.condition ?? null,
        seller: seed.price?.seller?.name ?? null,
    } : {}} />;
}
