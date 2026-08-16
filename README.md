# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. Los módulos de `src/`](#3-los-módulos-de-src)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Roadmap de mejoras](#roadmap-de-mejoras)
  - [Personalización](#personalización)
  - [Automatización con Claude](#automatización-con-claude)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Piezas especiales** que rompen la rutina de los tetrominós:
  - **Plus (+)**, **U** e **Y**: pentominós de 5 celdas que salen de vez en cuando (≈6 % al empezar, hasta un 12 % en niveles altos).
  - **Punto (1×1)**: se **regala** como recompensa la siguiente vez que haces un Tetris (4 líneas de golpe); nunca sale por azar.
  - **Cuadro hueco (3×3)**: anillo de 8 celdas que deja un agujero irrellenable. Solo aparece **a partir del nivel 5** y con poca frecuencia.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Reserva de pieza** (_hold_): guarda la pieza en juego para más tarde e intercámbiala cuando convenga, con un solo uso por pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Combos y multiplicadores**: limpiar líneas en piezas consecutivas multiplica la puntuación (hasta ×8); un T-spin (rotar la T encajándola en un hueco y limpiar) da un bonus fijo; dos Tetris o T-spins seguidos sin limpiezas normales entre medias dan **back-to-back** (+50 %); vaciar el tablero por completo da **Perfect Clear**. Cada racha se anuncia con un aviso flotante sobre el tablero y un marcador `COMBO` en el panel.
- **Power-ups aleatorios**: cada 10 líneas limpiadas, la siguiente pieza es una especial de 1×1 que dispara un efecto al fijarse (nunca se repite el tipo anterior): **Bomba** (destruye un 3×3), **Rayo** (limpia su fila y su columna enteras), **Tinte** (convierte todos los bloques de un color en comodines), **Gravedad** (compacta el tablero, sin huecos) o **Congelar** (detiene la caída automática 5 s reales, sin gastarse en pausa). Cada disparo suma puntos y se anuncia con una animación sobre el tablero.
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Interruptor de tema claro/oscuro**: arranca en modo oscuro; el switch en la esquina superior derecha cambia a modo claro y recuerda la preferencia (`localStorage`).

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar, **pero sí hace falta un servidor**: el
juego se carga como módulos ES (`<script type="module">`) y los navegadores los
bloquean cuando se abre el archivo con `file://`. Abrir `index.html` con doble
clic no funciona.

Cualquier servidor estático sirve:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `C` o `Shift` | Reservar la pieza actual (_hold_) |
| `P`       | Pausar / reanudar                 |
| `1`       | Habilidad: ver 5 piezas siguientes (20 de energía) |
| `2`       | Habilidad: cambiar la pieza actual (30 de energía) |
| `3`       | Habilidad: ralentizar la caída 10 s (40 de energía) |
| `4`       | Habilidad: deshacer el último fijado (60 de energía) |
| `5`       | Habilidad: reservar pieza, igual que `C` (10 de energía) |

---

## Cómo funciona

El juego se compone del marcado, los estilos y el motor en módulos:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, la pieza reservada (`HOLD`), el marcador `COMBO` (solo visible mientras hay racha), la vista de la siguiente pieza, la barra de `ENERGÍA` de las habilidades (con la lista de teclas `1`-`5` y su coste), la cola de próximas piezas (visible solo mientras dura la habilidad "ver 5 siguientes") y la lista de controles.
- Un overlay para los estados **PAUSA** y **GAME OVER**.

### 2. `style.css`

Aporta el aspecto visual con estética _retro arcade_, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays. Los colores del tema (oscuro por defecto) se definen como variables CSS en `:root`; la clase `body.light-theme` las sobreescribe con la paleta clara.

### 3. Los módulos de `src/`

La lógica está repartida en módulos ES con responsabilidades estrechas:

| Módulo | Responsabilidad |
| ------ | --------------- |
| `config.js` | Constantes: dimensiones, colores, piezas, puntuación, velocidades |
| `state.js` | El objeto `state` y `resetState()` |
| `events.js` | Bus de eventos del ciclo de vida (`on`, `emit`) |
| `board.js` | Matriz del tablero: colisiones, fijado, limpieza de líneas |
| `pieces.js` | Creación, rotación, wall kicks y pieza fantasma |
| `scoring.js` | Puntos, nivel y velocidad de caída |
| `render.js` | Todo el dibujado en canvas |
| `hud.js` | Marcadores del panel y overlay de pausa / game over |
| `theme.js` | Tema claro/oscuro y su persistencia |
| `actions.js` | Acciones del jugador y ciclo de vida de la pieza |
| `input.js` | Teclado, como tabla de teclas |
| `main.js` | Bucle de juego y cableado entre módulos |
| `features/` | Una carpeta por mejora del roadmap |

A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–7) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Tema claro/oscuro** (`applyTheme`, `initTheme`): alterna la clase `light-theme` en `<body>`, guarda la preferencia en `localStorage` (`tetris-theme`) y actualiza `gridLineColor` (leído de la variable CSS `--grid-line`) para que la rejilla del canvas coincida con el tema activo.

### Flujo del juego

```
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html            # Estructura del DOM y canvas
├── style.css             # Estilos del juego (tema oscuro y claro)
├── src/                  # Motor del juego, en módulos ES
│   ├── config.js
│   ├── state.js
│   ├── events.js
│   ├── board.js
│   ├── pieces.js
│   ├── scoring.js
│   ├── render.js
│   ├── hud.js
│   ├── theme.js
│   ├── actions.js
│   ├── input.js
│   ├── main.js           # Punto de entrada
│   └── features/         # Una mejora del roadmap por archivo
├── docs/upgrades/        # Roadmap: arquitectura y specs por mejora
└── README.md
```

---

## Roadmap de mejoras

Hay seis mejoras planificadas —power-ups, piezas no estándar, combos y
multiplicadores, modo desafío, habilidades cargables y sistema de hold—, cada una
con su especificación en [`docs/upgrades/`](docs/upgrades/README.md).

Se desarrollan en subramas que nacen de `feature/upgrades` (la rama padre del
roadmap) y vuelven a ella por Pull Request. El motor se dividió en módulos
precisamente para que esas ramas puedan avanzar en paralelo: cada mejora se
engancha al juego desde `src/features/` usando puntos de extensión (eventos,
teclas, capas de dibujado, modificadores de puntuación) en vez de editar el
núcleo.

Antes de empezar una mejora, lee
[`docs/upgrades/ARQUITECTURA.md`](docs/upgrades/ARQUITECTURA.md).

---

## Personalización

Algunos parámetros fáciles de tunear en `src/config.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 18 colores            |
| `STANDARD_PIECE_COUNT` | Cuántas piezas reparte la bolsa por defecto (las clásicas) | `7` |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `BASE_DROP_INTERVAL` | Velocidad inicial de caída en ms   | `1000`                |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Automatización con Claude

El repositorio usa [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) en tres workflows de GitHub Actions:

| Workflow                             | Cuándo se dispara                            | Qué hace                                                                 |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------ |
| `claude-issue-triage.yml`            | Al **abrir o editar** un issue                | Asigna labels y publica un diagnóstico técnico del problema              |
| `claude.yml`                         | Al mencionar **`@claude`** en issue/PR        | Ejecuta lo que le pidas: escribir el fix, abrir un PR, responder dudas    |
| `claude-code-review.yml`             | Al abrir o actualizar un **pull request**     | Revisa el código del PR                                                  |

Los tres se autentican con el secret `CLAUDE_CODE_OAUTH_TOKEN` del repositorio.

### Flujo de trabajo típico

1. Alguien abre un issue describiendo un bug o una mejora.
2. **`claude-issue-triage.yml`** lee el issue y el código, le pone labels del catálogo y deja un comentario con: _Resumen_, _Causa probable_, _Código implicado_ (con referencias tipo `src/main.js:24`), _Enfoque sugerido_, _Cómo reproducir_ y _Confianza_. Si el issue es vago, lo marca `needs-info` y pregunta lo que falta.
   - Es un comentario **único**: al editar el issue se actualiza en vez de duplicarse.
   - Este workflow **no** escribe código ni abre PRs.
3. Con el diagnóstico ya sobre la mesa, comentas **`@claude implementa el arreglo propuesto`** en el issue y `claude.yml` crea la rama y el PR.
4. **`claude-code-review.yml`** revisa ese PR automáticamente.

> Si el issue ya menciona `@claude` al crearse, el triage se salta (lo atiende `claude.yml`) para no duplicar comentarios.

### Labels

El catálogo vive en [`.github/labels.yml`](.github/labels.yml) y es una **lista cerrada**: el triage solo elige de ahí, nunca crea labels nuevos. Se agrupa en tipo (`bug`, `enhancement`, `documentation`, `refactor`, `question`), área (`gameplay`, `ui`, `controls`, `scoring`, `rendering`, `performance`), prioridad (`prioridad-alta/media/baja`) y meta (`needs-info`, `good-first-issue`, `roadmap`).

Para aplicarlos en GitHub, lanza el workflow **Sync labels** desde la pestaña _Actions_, o en local:

```bash
GH_TOKEN=$(gh auth token) .github/scripts/sync-labels.sh
```

Es idempotente. Si añades o cambias un label, edita **tanto** `.github/labels.yml` como el array `LABELS` de `.github/scripts/sync-labels.sh`, y actualiza la lista del prompt en `.github/workflows/claude-issue-triage.yml`.

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
