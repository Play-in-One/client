import { PREFS_COOKIE } from '@/lib/prefs';

/* Marca el documento ANTES de la primera pintura cuando el visitante tiene
 * filtros globales guardados, para que el CSS mantenga tapado lo que el
 * servidor mandó sin filtrar (ver globals.css) hasta que React pueda pintarlo
 * bien. Sin esto, quien apagó las tiendas internacionales las veía un instante
 * en cada carga: el HTML no puede salir filtrado porque la home es una página
 * ISR compartida entre todos.
 *
 * Va inline en el <head> por la misma razón que el ColorSchemeScript de Mantine
 * que tiene al lado: cualquier otra cosa corre después del primer paint, que es
 * justo lo que hay que evitar.
 *
 * Sólo marca a quien se desvía del default. Para la mayoría —y para todo
 * visitante nuevo— este script no hace nada y la página pinta como siempre.
 *
 * OJO: la condición de abajo es un allowlist LITERAL y tiene que enumerar cada
 * dimensión de los prefs. Es el más fácil de olvidar de los que hay que mover
 * juntos —`parsePrefs`, `isDefaultPrefs`, la lectura legacy de AppContext y
 * este— porque olvidarlo no rompe nada visible en desarrollo: simplemente el
 * anti-flash deja de activarse para esa preferencia, y el parpadeo sólo se ve
 * con la red lenta. El test que lo cubre está en `tests/e2e/flash.spec.ts` y
 * corre con throttling a propósito.
 */

// El timeout es un cinturón de seguridad: si React nunca hidrata (JS caído, un
// error en el bundle), nadie quitaría el atributo y la página quedaría con
// bloques invisibles para siempre. Mejor un parpadeo tardío que una página rota.
const SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )${PREFS_COOKIE}=([^;]*)/);if(!m)return;
var p=JSON.parse(decodeURIComponent(m[1]));
if(!p||(p.international!==false&&p.condition!=='new'&&p.condition!=='used'&&p.format!=='physical'&&p.format!=='digital'))return;
var e=document.documentElement;e.setAttribute('data-prefs','pending');
setTimeout(function(){e.removeAttribute('data-prefs')},3000);
}catch(_){}})()`;

export default function PrefsScript() {
    return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
