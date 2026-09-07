import { tryServerPerf } from '@/lib/serverPerf';

/* Le dice al navegador con qué identificador se sirvió esta página, para que
   el beacon pueda preguntarle al backend cuánto tardó en producirla.

   Lleva SOLO el identificador y la marca de generación, y no los tiempos del
   render. Se intentó lo segundo y no funciona: en el App Router el layout
   termina de renderizarse ANTES de que se resuelva el árbol de `{children}`,
   así que un componente colocado aquí —incluso después de `{children}` en el
   JSX— se ejecuta antes que los `fetch` de la página y mide siempre cero.
   Comprobado, no supuesto.

   Los tiempos de servidor los suma Django, que ve todas las llamadas de la
   navegación porque todas llegan con este mismo identificador. Sale mejor así:
   el dato ya no depende del orden de render, y al no pasar por el navegador no
   se puede falsificar. */

export interface ServerPerfPayload {
    /** Hexadecimal de 32 caracteres. Viaja en el beacon como `request_id`. */
    nav_id: string;
    /** ISO-8601. Ver abajo. */
    rendered_at: string;
}

export const PERF_ELEMENT_ID = 'pio-perf';

export default function PerfBeacon() {
    const perf = tryServerPerf();
    if (!perf) return null;

    const payload: ServerPerfPayload = {
        nav_id: perf.navId,
        /* Sin esta marca, la mitad de las cargas mentirían. Casi todas las
           páginas son ISR: en un acierto de caché no hay render, y este JSON
           viaja horneado en el HTML con el identificador de la regeneración que
           lo produjo —puede ser de hace horas—. Usarlo entonces atribuiría a
           esta carga el trabajo de otra. El navegador compara esta marca con su
           reloj y, si el HTML no se acaba de generar, manda el beacon sin
           identificador: la carga se registra igual, marcada como acierto de
           caché, que es en sí mismo el dato interesante. */
        rendered_at: new Date().toISOString(),
    };

    return (
        <script
            type="application/json"
            id={PERF_ELEMENT_ID}
            // Los dos valores los genera el servidor (hex y ISO-8601). El
            // escape de `<` es higiene por si algún día entra otro campo.
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(payload).replace(/</g, '\\u003c'),
            }}
        />
    );
}
