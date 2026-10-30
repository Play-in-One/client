# Sistema de diseño

PIO usa **Mantine 7** como base. El sistema de diseño es la capa de tokens y
reglas que va encima, y vive en tres archivos:

| Archivo | Qué define |
|---|---|
| `src/lib/colors.ts` | **Todos** los colores: marca, escala oscura, superficies, estado, elevación, velos, texto sobre fondo oscuro, gráficos, redes sociales, OG y PWA |
| `src/theme.ts` | El tema de Mantine: registra las paletas (`primaryRed`, `dark` y las de estado), la fuente y el radio por defecto |
| `src/theme.cssVariables.ts` | Las variables `--pio-*` que necesita el CSS global, con su valor en claro y en oscuro |

La excepción son los colores de cada consola, que viven en el catálogo
`src/lib/platforms.ts` junto a su icono y sus etiquetas (ver "Una consola se
añade en UN archivo por repositorio" en el `CLAUDE.md` del meta-repo).

La referencia visual está en **`/staff/diseno`**: pinta cada token tal como lo
resuelve el navegador, en el tema activo. No se enlaza ni se indexa.

## Reglas

1. **Ningún color literal fuera de `colors.ts` y `platforms.ts`.** ESLint lo
   impide (`no-restricted-syntax` en `eslint.config.mjs`): un `'#fff'` o un
   `rgba(...)` en un componente es un error de lint. Si falta un token, se
   añade a `colors.ts` con un comentario que diga dónde se usa.
2. **El estado se nombra por su significado, no por su tono.** `color="danger"`,
   `c="success"`, `color="warning"`, `color="caution"`, `color="info"`. Nunca
   `red`/`green` para un estado: el rojo de la marca (`primaryRed`) y el de un
   error no son el mismo color, y escribirlos igual impedía cambiar uno sin el
   otro.

   | Alias | Base | Para qué |
   |---|---|---|
   | `danger` | red | Errores, acciones destructivas, campo obligatorio |
   | `success` | green | Confirmaciones, "guardado", ahorro |
   | `warning` | yellow | Falta algo para continuar (sesión, datos aún no medidos) |
   | `caution` | orange | Acciones de efecto amplio (fusionar) y datos incompletos |
   | `info` | blue | Información neutra |

   Los colores **decorativos** que no expresan un estado (el amarillo de los
   controles de admin, las insignias de consola) siguen usando el nombre de su
   paleta.
3. **CSS global: solo variables.** `globals.css` usa `var(--mantine-*)` o
   `var(--pio-*)`; un color nuevo se declara en `theme.cssVariables.ts` desde
   un token, nunca escrito en el CSS.
4. **Un color que depende del tema** usa `light-dark(...)` o una variable con
   valor por esquema, no `useMantineColorScheme()`: el hook no conoce el tema
   durante el render del servidor y provoca un parpadeo al hidratar.
5. **Una tarjeta clicable lleva `className="pio-lift"`** y nada más: sube 2 px y
   gana la sombra `elevation.hover`. La clase vive en `globals.css`, no se activa
   en táctil (`hover: hover`) y con `prefers-reduced-motion` solo cambia la
   sombra. No se escriben `onMouseEnter`/`onMouseLeave` para un hover: antes
   había cuatro versiones (subían 2, 3, 4 o 0 px, con tres sombras y dos
   duraciones), y la de `GameCard` borraba el anillo de la tarjeta seleccionada
   al quitar el cursor.

## Valores por defecto del tema

`theme.components` fija lo que casi todos los usos repetían:

| Componente | Por defecto | Cuándo se escribe la prop |
|---|---|---|
| `Card` | `withBorder`, `radius="lg"` | `radius="md"` en el staff; `radius="xl"` en las superficies destacadas de la ficha |
| `Tooltip` | `withArrow` | Nunca: todos los tooltips llevan flecha |

No se fijó por defecto lo que no tiene una mayoría clara o cambiaría lo que ya
se ve: `Badge` (13 rellenos frente a 10 `light`), `Button` y `ActionIcon` (sin
variante dominante). `Alert` no lo necesita: sin variante, Mantine ya la pinta
`light`.

## Tipografía y espaciado

- **Tamaños**: la escala de Mantine (`xs` 12, `sm` 14, `md` 16, `lg` 18, `xl` 20)
  más `2xl` (28) y `3xl` (42) para cifras grandes. Un tamaño fuera de la escala
  necesita motivo; los gráficos de Recharts siguen en número porque su API lo pide.
- **Pesos**: 500, 600, 700 y 800. El 900 es solo para el logotipo.
- **Carga**: `Skeleton` no anima con el pulso de Mantine sino con un brillo de
  izquierda a derecha (`globals.css`), una sola onda a lo ancho de la pantalla.
  Con movimiento reducido queda estático.
- **Espaciado**: la escala de Mantine más `2xs` (4 px), entre iconos y etiquetas,
  y `section` (60 px), entre secciones.

## Contraste

Mínimos WCAG AA: 4,5:1 para texto normal, 3:1 para texto grande e iconos. Reglas
que salen de haberlo medido:

- **El rojo de marca como texto es `var(--pio-brand-text)`**, nunca el tono 5,
  que se queda en botones y logotipo.
- **`dimmed` lo fija el tema** (`foregrounds`), no Mantine.
- **El texto de la variante `light`** y el de `c="success"`/`c="danger"` lo fija
  `lightVariantText` en modo claro: Mantine usa el tono 6, que no llega al mínimo.
- **Una fila atenuada se apaga con color, no con opacidad**
  (`data-out-of-stock`): la opacidad baja también el contraste del texto.
- **Los colores de consola no se tocan por contraste.** `lib/platforms.ts` lleva
  los colores oficiales de cada consola, y son una excepción deliberada aunque sus
  insignias con texto blanco queden bajo 4,5:1 (en claro casi todas; en oscuro,
  Xbox y Wii). Se midió y se decidió así: no es un pendiente.

## Tokens

- **Marca** — `brand.primaryScale` (10 tonos, «Signature Red», índice 5 =
  `brand.primary`). Es el `primaryColor` del tema.
- **Escala oscura** — `darkScale`, fondo `#121212`. Índices 0–3 texto, 4–9
  superficies; cada índice tiene un uso fijo documentado en el archivo.
- **Superficies** — `surfaces.light`/`surfaces.dark` (navbar, cuerpo, barra de
  búsqueda, scrollbar) y los tintes de sección alterna.
- **Estado** — `semantic` (ver tabla). `ratingColor(nota)` devuelve uno de
  ellos y es la única escala para las valoraciones.
- **Valoración** — dos formas, según el fondo, y ninguna otra:
  - sobre una portada, `<RatingPill value>`: velo `scrim.strong`, estrella con
    el color de la nota en tono 4 y número blanco. El tono 4 y no el 5 porque
    el velo deja pasar la foto: con una portada clara, el rojo del 5 quedaba en
    2,5:1;
  - sobre la tarjeta, estrella `ratingStar` (`light-dark`) junto al número. En
    claro es un dorado oscuro (3,25:1 sobre blanco); el `#f5b400` original
    daba 1,8:1.

  Un icono que lleva información necesita 3:1 contra lo que tiene detrás
  (WCAG 1.4.11). Una estrella dorada sobre una insignia de color no lo cumple
  con ninguna nota (1,0–1,8:1), así que esa combinación no se usa.
- **Elevación** — `elevation.raised | hover | cover`. `hover` llega al CSS como
  `--pio-shadow-hover` y solo lo usa `.pio-lift`. Las sombras `shadow="xs…xl"`
  de Mantine no se tocan.
- **Velos** — `scrim.soft | medium | base | strong`, para leer iconos y cifras
  sobre una portada.
- **Sobre fondo oscuro** — `onDark.*`: texto y bordes para superficies que son
  oscuras en los dos temas (tarjeta de mejor precio, aviso de cookies, botones
  sobre portada).
- **Gráficos** — `chart.series` (tonos con nombre, para series con identidad
  propia), `chart.sequence` (orden de asignación cuando no la tienen),
  `chart.channels` (validada para claro y oscuro: no cambiar un tono sin volver
  a validarla), y los de ejes, tooltip y línea de referencia.
