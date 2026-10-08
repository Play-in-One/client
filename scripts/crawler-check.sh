#!/usr/bin/env bash
# Lo que ve un crawler de IA (GPTBot, ClaudeBot, PerplexityBot): el HTML
# inicial, sin ejecutar JavaScript. Se quitan los <script> porque el JSON-LD y
# el flight data de Next repiten el texto de la página y darían un falso OK.
#
# Uso:
#   GAME=/juego/<slug>-<id> scripts/crawler-check.sh [BASE_URL]
# BASE_URL por defecto http://localhost:3001. Sale con 1 si falta algo.
set -u

B=${1:-http://localhost:3001}
fail=0

html() { curl -sA GPTBot "$1" | perl -0pe 's/<script\b[^>]*>.*?<\/script>//gs'; }

# need PATH 'texto': el HTML servido de PATH contiene el texto literal.
need() {
    if html "$B$1" | grep -qF -- "$2"; then
        echo "ok    $1  «$2»"
    else
        echo "MISS  $1  «$2»"
        fail=1
    fi
}

if [ -n "${GAME:-}" ]; then
    need "$GAME" 'Resumen de precios'
    need "$GAME" 'precio más barato'
    need "$GAME" 'Último cambio de precio'
else
    echo "skip  ficha de juego (define GAME=/juego/<slug>-<id>)"
fi

# Las páginas interiores de la paginación existen para el rastreo, no para el
# índice (ver "SEO y GEO" en CLAUDE.md).
need /juegos/ps5/pagina/2 'noindex'

exit $fail
