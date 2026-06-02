# Play in One — Frontend

Interfaz web del comparador de precios de videojuegos para Chile. Construida con Next.js 15 (App Router) y Mantine 7.

## Tecnologías

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
npm run dev           # desarrollo en http://localhost:3001
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
