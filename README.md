# Play in One — Frontend

Interfaz web del comparador de precios de videojuegos para Chile. Construida con Next.js 15 (App Router) y Mantine 7.

## Salidas a tiendas

Las ofertas y enlaces generales de tienda pasan por `/go/product/{id}` y
`/go/store/{id}`. El servidor resuelve el destino desde el catálogo, respeta
`pio_consent` y registra `offer_click`/`store_click` antes de un 302 sin caché.
Las cookies de visitante permanecen en el servidor; solo la atribución saneada
viaja en el enlace. Las rutas también funcionan al abrir desde el menú contextual.

El `Caddyfile` de producción confía en los rangos oficiales de Cloudflare y
normaliza `X-Forwarded-For` desde `CF-Connecting-IP` para frontend y API. Esto
conserva el mismo identificador diario anónimo en ambos recorridos. Revisar la
lista de rangos cuando Cloudflare la actualice; no confiar en IPs privadas ni
cabeceras de conexiones directas. Referencias: [Caddy](https://caddyserver.com/docs/caddyfile/options#trusted-proxies)
y [rangos de Cloudflare](https://www.cloudflare.com/ips/).
Desde la raíz de `Develop`, `python scripts/check_proxy_identity.py` valida
la configuración y prueba cabeceras confiables y falsificadas con Caddy local.

Se necesitan `API_URL` (backend accesible desde Next) y el mismo
`VISITOR_ID_SECRET` en ambos servicios para conservar la identidad consentida.
El destino dispone de 2 segundos para resolverse y el registro de 500 ms, sin
reintentos. Si el registro falla, la salida continúa; si el catálogo falla,
aparece una opción de reintentar. HEAD y precargas no generan clics.

Pruebas de rutas: `npx playwright test -c playwright.unit.config.ts`.
Pruebas de navegación: `npx playwright test tests/e2e/outbound.spec.ts`.
Después del despliegue, comprobar en TikTok/Instagram reales y observar 48 horas
los logs JSON `event=outbound`: `recorded`, `bot`, `opt_out`, `prefetch`,
`event_rejected`, `event_unavailable` y `catalog_unavailable`.

## Tecnologías del cliente

- **Next.js 15** (App Router)
- **React 19**
- **Mantine 7** — componentes UI + tema (`src/theme.ts`)
- **Tabler Icons** + **react-icons** (íconos de plataformas)
- **Recharts** — gráfico de comparativa de precios en detalle de juego
- **Playwright** — tests E2E
- **TypeScript 5**

## Requisitos

- Node.js v22 LTS
- Backend Django corriendo en `http://localhost:8001` (ver `backend/`)

## Instalación

```bash
npm install
cp .env.example .env.local
```

Editar `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8001/api
```

## Comandos

```bash
npm run dev           # desarrollo en http://localhost:3001 (default)
npm run build         # build de producción
npm run start         # servidor de producción
npm run lint          # ESLint
npm run test:e2e      # tests E2E con Playwright (auto-arranca el servidor)
npm run test:e2e:ui   # Playwright con interfaz interactiva
```

## Variables de Entorno

| Variable               | Descripción                 | Default                     |
|------------------------|-----------------------------|-----------------------------|
| `NEXT_PUBLIC_API_URL`  | URL base de la API Django   | `http://localhost:8001/api` |
| `FRONTEND_PORT`        | Puerto del dev server (`npm run dev`) y de Playwright | `3001` |

> `FRONTEND_PORT` se expande con `sh` en el script `dev` (`next dev -p ${FRONTEND_PORT:-3001}`), por lo que requiere un shell POSIX (Linux/macOS/WSL). `NEXT_PUBLIC_API_URL` también define el `remotePattern` de imágenes `/media/` en `next.config.mjs`, y se hornea en build time.

## Páginas

| Ruta              | Descripción                                               |
|-------------------|-----------------------------------------------------------|
| `/`               | Home: buscador, plataformas, últimas noticias             |
| `/search`         | Búsqueda con filtros: plataforma, género, vendedor, precio|
| `/game/[id]`      | Detalle: tabla comparativa de precios + gráfico           |
| `/blog`           | Listado de artículos y noticias                           |
| `/blog/[id]`      | Artículo individual                                       |
| `/about`          | Acerca de PIO                                             |
| `/contact`        | Formulario de contacto                                    |
| `/terms`          | Términos y condiciones                                    |

## Estructura

```
src/
├── app/                  # Páginas (Next.js App Router)
├── components/
│   ├── Navbar.tsx        # Navegación sticky con búsqueda y dark/light toggle
│   ├── Footer.tsx
│   ├── GameCard.tsx      # Tarjeta de juego con imagen, precio mínimo y vendedor
│   └── PlatformBadge.tsx
├── context/
│   └── AppContext.tsx    # Estado global: searchQuery, selectedPlatform
├── lib/
│   ├── api.ts            # Cliente fetch tipado para todos los endpoints Django
│   ├── types.ts          # Interfaces TypeScript espejo de los serializers
│   └── utils.ts          # formatCLP(), PLATFORM_COLORS, PLATFORM_ICON_MAP
└── theme.ts              # Tema Mantine (primaryRed, Poppins)
```

## Tests E2E

Los tests viven en `tests/e2e/` y usan Playwright con mocks de API (`page.route()`).
No requieren backend activo para correr.

```bash
npm run test:e2e        # todos los tests
npm run test:e2e:ui     # modo interactivo con inspector
```

Cobertura:
- `home.spec.ts` — carga home, Navbar, tarjetas, preview blog
- `search.spec.ts` — búsqueda por texto, filtros de plataforma, paginación, params URL
- `game-detail.spec.ts` — tabla comparativa, gráfico condicional, estado vacío, badges condición
- `blog.spec.ts` — listado posts, navegación a detalle, badges categoría
- `navigation.spec.ts` — links Navbar, dark/light toggle, menú mobile
