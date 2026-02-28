# Play in One - Frontend (Client)

Este es el frontend de la plataforma **Play in One**, un comparador de precios de videojuegos enfocado en el mercado chileno.

## 🚀 Tecnologías

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [Mantine v7](https://mantine.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: PostCSS + Mantine Theme
- **Gráficos**: [Recharts](https://recharts.org/) (para el historial de precios)
- **Íconos**: [Tabler Icons](https://tabler.io/icons) y Material Icons Round

## 📦 Requisitos Previos

- **Node.js**: v22 LTS (recomendado instalar vía [nvm](https://github.com/nvm-sh/nvm))
- El backend en Django debe estar corriendo localmente en `http://localhost:8000` (con configuración de CORS apropiada).

## 🛠️ Instalación y Uso

1. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abrir la aplicación:
   Visita [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

- `src/app/` - Páginas (Rutas) de Next.js (Home, Búsqueda, Detalle del juego, Plataforma).
- `src/components/` - Componentes de interfaz compartidos (Navbar, Footer, GameCard, etc.).
- `src/context/` - Estado global (AppContext) para la gestión del carrito, plataforma actual, y tema claro/oscuro.
- `src/lib/` - Utilidades generales, tipos TypeScript (interfaces), y cliente API para consumir endpoints de Django.
- `src/theme.ts` - Configuración principal del diseño (colores corporativos, tipografías, etc.).

## 📝 Notas de Integración

- Asegúrate de tener el backend expuesto. Las llamadas se hacen usando las credenciales predeterminadas para desarrollo local (`http://localhost:8000/api`).
- Variables de entorno: Dependiendo de tu configuración en producción, es probable que quieras configurar un alias central en `.env` (por ejemplo, `NEXT_PUBLIC_API_URL`).
