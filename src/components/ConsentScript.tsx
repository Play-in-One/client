import { CONSENT_COOKIE, POLICY_VERSION } from '@/lib/consent';

/* Marca el documento ANTES de la primera pintura cuando falta una decisión de
 * cookies válida, para que el aviso que ya viene en el HTML se vea de entrada.
 *
 * El aviso es lo primero que ve un visitante nuevo y el bloque de texto más
 * grande de la pantalla, o sea su LCP. Antes se montaba recién al hidratar:
 * con un móvil y una red lentos aparecía a los ~9 s (medido el 2026-11-02),
 * cuando el resto de la portada llevaba siete segundos pintado. El HTML no
 * puede decidirlo porque la home es ISR y la comparten todos.
 *
 * Hasta que React hidrata, los botones del aviso no tienen manejador. Un clic
 * en ese intervalo se guarda en `window.__pioConsentChoice`, oculta el aviso
 * en el acto y `CookieBanner` lo aplica al montar: no se pierde la decisión.
 *
 * Repite la regla de `parseConsent`: cookie con `analytics` booleano y la
 * versión vigente de la política. Si divergen, solo cambia cuándo aparece el
 * aviso: tras hidratar, `CookieBanner` vuelve a decidir con `parseConsent`.
 */
const SCRIPT = `(function(){try{
if(location.pathname.indexOf('/staff')===0)return;
var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/),c=null;
try{c=m&&JSON.parse(decodeURIComponent(m[1]))}catch(_){}
if(c&&typeof c.analytics==='boolean'&&c.v===${JSON.stringify(POLICY_VERSION)})return;
var h=document.documentElement;h.setAttribute('data-consent','pending');
document.addEventListener('click',function(e){
var b=e.target&&e.target.closest&&e.target.closest('[data-consent-choice]');
if(!b||window.__pioConsentReady)return;
e.preventDefault();window.__pioConsentChoice=b.getAttribute('data-consent-choice');
h.setAttribute('data-consent','queued');
},true);
}catch(_){}})()`;

export default function ConsentScript() {
    return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
