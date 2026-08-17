# Arquitectura del motor (`src/`)

Lectura obligatoria antes de empezar una subrama. Explica cómo está partido el
juego y, sobre todo, **dónde engancha tu mejora sin pisar a nadie**.

## De un archivo a módulos

Hasta esta rama todo el juego era un `game.js` de ~335 líneas cargado como
script clásico. Con seis mejoras entrando en paralelo, ese archivo era una
garantía de conflictos en cada merge. Ahora el motor está repartido en módulos
ES con responsabilidades estrechas y ganchos explícitos.

Consecuencia práctica: `index.html` carga `<script type="module" src="src/main.js">`,
así que **el juego necesita servirse por HTTP** (`python3 -m http.server 8000`).
Abrir el archivo con `file://` ya no funciona.

## Los módulos

```
src/
├── config.js          Constantes: COLS, ROWS, BLOCK, COLORS, PIECES, LINE_SCORES,
│                      velocidades. Sin lógica y sin imports.
├── state.js           `state` (objeto mutable) + createBoard() + resetState().
├── events.js          Bus de eventos: EVENTS, on(), off(), emit().
├── board.js           Matriz del tablero: collide(), merge(), clearLines(),
│                      isEmptyBoard(), clearCell().
├── pieces.js          makePiece(), randomPiece(), rotateCW/CCW(), tryRotate(),
│                      ghostY(), KICKS, setPieceSelector().
├── scoring.js         Puntos, nivel y velocidad + addScoreModifier().
├── render.js          Canvas: draw(), drawNext(), drawBlock(), drawShape(),
│                      drawPieceIn(), registerPainter(), setGridLineColor().
├── hud.js             Marcadores y overlay: updateHUD(), showOverlay(),
│                      hideOverlay(), registerHudUpdater().
├── theme.js           Tema claro/oscuro y persistencia en localStorage.
├── actions.js         Acciones del jugador y ciclo de la pieza: moveLeft/Right,
│                      rotate, softDrop, hardDrop, lockPiece, spawn, endGame,
│                      togglePause.
├── input.js           Teclado como tabla: bindKey(), initInput().
├── main.js            Bucle rAF, arranque y cableado entre módulos.
└── features/
    ├── index.js       Registro de mejoras (el array que activa cada una).
    └── <tu-mejora>.js Tu código.
```

Dirección de las dependencias (nadie importa hacia arriba, no hay ciclos):

```
config ─┬─► state ──► board ──► pieces ──► actions ──► input
        │                 ▲        ▲          │
        ├─► scoring ──────┘        │          │
        ├─► render ◄───────────────┘          │
        ├─► hud ──────────────────────────────┘
        └─► theme ──► render
                        ▲
              main ─────┴──► features/*
```

## El estado

`state` es un **objeto exportado y mutado in situ**, no variables sueltas: los
bindings `let` exportados son de solo lectura para quien importa, así que un
objeto compartido es la única forma limpia de que todos los módulos vean lo
mismo.

```js
import { state } from '../state.js';
state.score += 100;
```

Todo campo nuevo se declara en `state` y se reinicia en `resetState()`. Si no se
reinicia, se filtra a la partida siguiente — es el bug clásico de este proyecto.
Si tu mejora prefiere guardar su estado en su propio módulo, suscríbete a
`EVENTS.RESET` para limpiarlo.

## El ciclo de vida y sus eventos

```
init()
 ├─ resetState()
 ├─ emit(RESET)                     ← limpia el estado de las mejoras
 ├─ next = randomPiece()
 ├─ spawn() ─► emit(SPAWN)          ← main repinta la vista NEXT
 └─ requestAnimationFrame(loop)
      │
      ▼
   loop(ts)
     ├─ dropAccum += dt
     ├─ si dropAccum ≥ dropInterval:
     │     baja una fila  ó  lockPiece()
     │        ├─ merge()      ─► emit(LOCK)
     │        ├─ clearLines() ─► addLineClearScore() ─► emit(LINES_CLEAR)
     │        │                       └─► emit(LEVEL_UP) si sube el nivel
     │        └─ spawn() ─► emit(SPAWN)  ó  endGame() ─► emit(GAME_OVER)
     ├─ draw()   (rejilla → tablero → fantasma → pieza → painters)
     └─ requestAnimationFrame(loop)

  keydown ─► input.js ─► acción de actions.js ─► updateHUD()
  P ─► togglePause() ─► emit(PAUSE) / emit(RESUME)  ← main para/arranca el bucle
```

`main.js` es el único que llama a `requestAnimationFrame` y a
`cancelAnimationFrame`. Si tu mejora necesita parar el tiempo (Congelar,
Ralentizar), **no toques el bucle**: manipula `state.dropInterval` o
`state.dropAccum`, o marca una bandera propia y salta la bajada. Al reanudar hay
que refrescar `state.lastTime`, o el primer frame verá un `dt` enorme.

## Los puntos de extensión, con ejemplo

Plantilla de una mejora completa (`src/features/ejemplo.js`):

```js
'use strict';

import { state } from '../state.js';
import { EVENTS, on } from '../events.js';
import { bindKey } from '../input.js';
import { registerPainter } from '../render.js';
import { registerHudUpdater, updateHUD } from '../hud.js';
import { addScoreModifier } from '../scoring.js';

export function registerEjemplo() {
  // 1. Estado propio, limpiado en cada partida.
  let contador = 0;
  on(EVENTS.RESET, () => { contador = 0; });

  // 2. Reaccionar al juego.
  on(EVENTS.LINES_CLEAR, ({ cleared, rows }) => {
    contador += cleared;
    updateHUD();
  });

  // 3. Tecla nueva.
  bindKey('KeyC', () => { /* … */ });

  // 4. Pintar encima del tablero.
  registerPainter((ctx) => { /* … */ });

  // 5. Marcador nuevo en el panel lateral.
  registerHudUpdater(() => {
    document.getElementById('mi-marcador').textContent = contador;
  });

  // 6. Modificar la puntuación.
  addScoreModifier((puntos, { cleared }) => puntos * (contador > 3 ? 2 : 1));
}
```

Y su activación en `src/features/index.js`:

```js
import { registerEjemplo } from './ejemplo.js';

const features = [
  registerEjemplo,
];
```

Todos los registradores (`on`, `registerPainter`, `registerHudUpdater`,
`addScoreModifier`) devuelven una función para darse de baja, por si tu mejora
se activa y desactiva sola.

## Reglas del canvas

- `#board` mide `300 × 600` en `index.html` y debe seguir cuadrando con
  `COLS × BLOCK` por `ROWS × BLOCK`. Si cambias `COLS`, `ROWS` o `BLOCK`,
  actualiza el HTML.
- `#next-canvas` mide `120 × 120` = `NEXT_CELLS × NEXT_BLOCK`. Una pieza de más
  de 4 celdas de ancho (pentominós) **no cabe**: hay que subir `NEXT_CELLS` o
  bajar `NEXT_BLOCK` y ajustar el HTML.
- `draw()` repinta todo cada frame; no hay dirty rectangles. Cualquier cosa que
  dibujes desde un painter se borra y se vuelve a pintar sola.
- El color de la rejilla no lo pone CSS sino `setGridLineColor()`, porque el
  canvas no hereda variables CSS. Si añades un canvas nuevo, suscríbete a
  `EVENTS.THEME_CHANGE` para repintarlo al cambiar de tema.

## Idioma

Textos de interfaz y comentarios **en español**; identificadores en **inglés**.
Se mantiene la convención del proyecto.
