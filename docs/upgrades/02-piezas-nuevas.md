# 02 — Piezas nuevas no estándar

| | |
| - | - |
| **Subrama** | `upgrade/02-piezas-nuevas` |
| **Base del PR** | `feature/upgrades` |
| **Depende de** | nada |
| **Orden de merge** | **2.ª** |
| **Labels** | `enhancement`, `gameplay`, `rendering` |

## Objetivo

Ampliar el repertorio más allá de los siete tetrominós clásicos con piezas
especiales que aparecen ocasionalmente y cambian el ritmo de la partida.

## Alcance

Piezas del gist:

| Pieza | Forma | Rol |
| ----- | ----- | --- |
| **Plus (+)** | cruz de 5 celdas | difícil de encajar, aparece rara vez |
| **U** | 5 celdas en U | deja un hueco propio, castiga el apilado plano |
| **Y** | 5 celdas asimétrica | pentominó de relleno |
| **Punto (1×1)** | 1 celda | **recompensa**: aparece tras hacer un Tetris |
| **Cuadro hueco (3×3)** | anillo de 8 celdas | **desafío**: aparece en niveles altos |

Frecuencia sugerida: las piezas estándar mantienen la inmensa mayoría de las
apariciones; los pentominós entran con una probabilidad baja (≈8 % combinada) y
sube ligeramente con el nivel. El 1×1 **no** sale por azar: se concede.

## Diseño técnico

**Archivos:** `src/config.js` (listas) + `src/features/piezas-nuevas.js` (bolsa).

> Esta es la única mejora que amplía `config.js`. Mergéala pronto para que las
> demás ramas rebasen sobre las listas ya definitivas.

### 1. Registrar las piezas

En `src/config.js`, añade entradas **al final y en el mismo índice** de `COLORS`
y `PIECES`. `PIECE_COUNT` se deriva de `PIECES.length`, así que no hay que tocar
nada más: `randomPiece()`, `merge()` y `drawBlock()` las recogen solas.

```js
export const COLORS = [
  null,
  /* …los 7 actuales… */
  '#f06292', // 8  Plus
  '#4db6ac', // 9  U
  '#9575cd', // 10 Y
  '#fff176', // 11 Punto
  '#a1887f', // 12 Cuadro hueco
];

export const PIECES = [
  null,
  /* …los 7 actuales… */
  [[0,8,0],[8,8,8],[0,8,0]],                      // Plus
  [[9,0,9],[9,9,9],[0,0,0]],                      // U
  [[0,10,0],[10,10,0],[0,10,0],[0,10,0]],         // Y (revisar orientación)
  [[11]],                                          // Punto
  [[12,12,12],[12,0,12],[12,12,12]],              // Cuadro hueco
];
```

Elige colores que se distingan de los siete existentes **en los dos temas**.

### 2. Controlar cuándo salen

No modifiques `randomPiece()`. Sustituye el selector:

```js
import { setPieceSelector, defaultPieceSelector } from '../pieces.js';

setPieceSelector(() => {
  if (recompensaPendiente) { recompensaPendiente = false; return PUNTO; }
  if (state.level >= 5 && Math.random() < 0.03) return CUADRO_HUECO;
  if (Math.random() < probabilidadPentomino()) return elegirPentomino();
  return defaultPieceSelector();   // los 7 de siempre
});
```

Y la recompensa del Tetris:

```js
on(EVENTS.LINES_CLEAR, ({ cleared }) => {
  if (cleared === 4) recompensaPendiente = true;
});
```

### Detalles que se pasan por alto

- **Rotación.** `rotateCW()` transpone e invierte: funciona con cualquier matriz,
  incluidas las no cuadradas (Y es 4×3). Lo que puede quedar raro es el centro de
  giro. Si una pieza gira mal, prueba a definirla en una matriz cuadrada (4×4)
  con relleno de ceros en vez de tocar el algoritmo. El Plus y el Cuadro hueco
  son simétricos y no cambian al rotar: es correcto y no hace falta código
  especial.
- **`collide()` y matrices no cuadradas** ya está cubierto: itera por
  `shape[r].length` fila a fila.
- **La vista NEXT solo tiene 4×4 celdas** (`NEXT_CELLS`/`NEXT_BLOCK` en
  `config.js`, `#next-canvas` 120×120 en `index.html`). Las piezas de este spec
  caben, pero si añades alguna de 5 de ancho hay que subir `NEXT_CELLS` a 5 y
  bajar `NEXT_BLOCK` a 24 para mantener el lienzo en 120 px.
- **El 1×1 y `spawn()`.** Una pieza de una celda entra centrada en `x = 5`.
  Comprueba que la posición de salida no la deje pegada al borde.
- **El Cuadro hueco crea un hueco imposible de rellenar** por diseño; es el
  punto de la pieza, pero verifica que no rompe `clearLines()`.

## Criterios de aceptación

- [ ] Las cinco piezas aparecen, se dibujan con su color y se fijan bien.
- [ ] Todas rotan sin salirse del tablero ni atravesar bloques.
- [ ] El 1×1 aparece **solo** tras un Tetris (4 líneas), una vez.
- [ ] El cuadro hueco solo aparece a partir del nivel configurado.
- [ ] Las piezas nuevas se ven completas en la vista NEXT.
- [ ] Los colores nuevos se distinguen en tema claro y oscuro.
- [ ] Jugando 3 minutos, la mayoría de piezas siguen siendo las clásicas.
- [ ] Resto de la Definition of Done del [README](README.md).

## Pruebas manuales

1. Fuerza temporalmente `setPieceSelector(() => 8)` y comprueba pieza a pieza:
   dibujo, rotación en las cuatro orientaciones, rotación pegada a cada pared,
   fijado y vista NEXT. Repite con 9, 10, 11 y 12. **Quita el forzado antes del PR.**
2. Haz un Tetris y comprueba que la siguiente pieza es el 1×1.
3. Llega al nivel 5 y verifica que el cuadro hueco empieza a salir.
4. Cambia de tema con las piezas nuevas en pantalla.
