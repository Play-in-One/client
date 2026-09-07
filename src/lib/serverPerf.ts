import { cache } from 'react';

/* Cuánto tardó el servidor en producir ESTA página, acumulado durante el
   render.

   `React.cache()` da una instancia por render de petición, que es justo el
   alcance que hace falta: un módulo con una variable suelta se compartiría
   entre peticiones concurrentes del mismo proceso de Next —el problema que ya
   tiene `failedRequestsCache` en `api.ts`— y mezclaría los tiempos de dos
   visitantes distintos.

   El identificador de navegación lo acuña aquí el SERVIDOR y no el navegador:
   el documento se pide antes de que exista JS de cliente, así que este es el
   único punto capaz de etiquetar con el mismo valor las llamadas a Django y el
   HTML que las provocó. */

export interface ServerPerf {
    /** Hexadecimal de 32 caracteres. Viaja como `X-Request-Id` a Django. */
    navId: string;
    /** Suma del tiempo pasado dentro de `fetch` contra la API. */
    apiMs: number;
    apiCalls: number;
    startedAt: number;
}

/* `crypto.randomUUID` del objeto global (Web Crypto), no `node:crypto`: este
   módulo lo alcanza el grafo de imports de `api.ts`, que también se bundlea
   para el navegador, y un import de Node ahí rompe la compilación. */
function newNavId(): string {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
}

export const serverPerf = cache((): ServerPerf => ({
    navId: newNavId(),
    apiMs: 0,
    apiCalls: 0,
    startedAt: performance.now(),
}));

/** El acumulador de esta petición, o `null` fuera de un render de React.
 *
 *  `cache()` solo tiene sentido dentro de un render; en un route handler o en
 *  `sitemap.ts` puede no funcionar o lanzar. Medir no debe poder tumbar una
 *  página, así que aquí se degrada a "no medimos esta". */
export function tryServerPerf(): ServerPerf | null {
    if (typeof window !== 'undefined') return null;
    try {
        return serverPerf();
    } catch {
        return null;
    }
}

