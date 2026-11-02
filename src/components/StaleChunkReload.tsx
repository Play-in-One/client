/* Recarga la página una vez si no carga un archivo de `/_next/static/`.
 *
 * Pasa cuando el navegador conserva estado de un despliegue anterior (una
 * pestaña o sesión restaurada de hace semanas) y pide chunks que ya no existen:
 * cada build cambia sus nombres. El 404 deja módulos sin definir y la página
 * revienta con "Cannot read properties of undefined (reading 'call')", sin que
 * Next lo recupere. El 409 del middleware solo cubre las peticiones RSC.
 *
 * Va inline en el <head> para escuchar desde antes de que se pida el primer
 * chunk. El error de carga de un <script> o <link> no burbujea, así que se
 * escucha en captura. `sessionStorage` evita un bucle si el archivo de verdad
 * no existe: como máximo una recarga por minuto en la pestaña.
 */
const SCRIPT = `(function(){addEventListener('error',function(e){try{
var t=e.target,u=t&&(t.src||t.href);
if(!u||(t.tagName!=='SCRIPT'&&t.tagName!=='LINK')||u.indexOf('/_next/static/')<0)return;
var k='pio-stale-chunk-reload',n=Date.now(),l=+sessionStorage.getItem(k)||0;
if(n-l<60000)return;sessionStorage.setItem(k,String(n));location.reload();
}catch(_){}},true)})()`;

export default function StaleChunkReload() {
    return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
