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

Implementado así (los tonos se eligieron en los huecos de matiz que dejan los
siete clásicos, para que se distingan en tema claro y oscuro):

```js
export const COLORS = [
  null,
  /* …los 7 actuales… */
  '#ec407a', // 8  Plus (+)       magenta
  '#009688', // 9  U              verde azulado
  '#5c6bc0', // 10 Y              índigo
  '#c0ca33', // 11 Punto (1×1)    lima
  '#8d6e63', // 12 Cuadro hueco   marrón
];

export const PIECES = [
  null,
  /* …los 7 actuales… */
  [[0,8,0],[8,8,8],[0,8,0]],                 // Plus
  [[9,0,9],[9,9,9],[0,0,0]],                 // U
  [[0,10],[10,10],[0,10],[0,10]],            // Y: 4×2, gira a 2×4
  [[11]],                                    // Punto
  [[12,12,12],[12,0,12],[12,12,12]],         // Cuadro hueco
];
```

**Ojo con `PIECE_COUNT`.** Se deriva de `PIECES.length`, así que al añadir las
cinco piezas la bolsa por defecto pasaría a repartirlas de forma uniforme
(≈42 % de piezas raras) aunque la mejora estuviera desactivada. Por eso se añadió
`STANDARD_PIECE_COUNT = 7` en `config.js` y `defaultPieceSelector()`
(`pieces.js`) reparte solo entre los clásicos: las especiales existen en las
listas, pero únicamente salen cuando el selector de esta mejora las concede.

### 2. Controlar cuándo salen

No se modifica `randomPiece()`: `src/features/piezas-nuevas.js` sustituye el
selector con este orden de prioridad —recompensa → castigo de nivel alto →
pentominó → clásica:

```js
setPieceSelector(() => {
  if (dotPending) { dotPending = false; return DOT; }
  if (state.level >= RING_MIN_LEVEL && Math.random() < RING_CHANCE) return RING;
  if (Math.random() < pentominoChance()) return pickPentomino();
  return defaultPieceSelector();   // los 7 de siempre
});
```

Y la recompensa del Tetris, con su limpieza al reiniciar (el pendiente es estado
del módulo, no de `state`):

```js
on(EVENTS.LINES_CLEAR, ({ cleared }) => { if (cleared >= 4) dotPending = true; });
on(EVENTS.RESET, () => { dotPending = false; });
```

Números finales:

| Constante | Valor | Efecto |
| --------- | ----- | ------ |
| `PENTOMINO_BASE_CHANCE` | `0.06` | probabilidad conjunta de Plus/U/Y en el nivel 1 |
| `PENTOMINO_LEVEL_STEP` | `0.005` | cuánto sube por nivel |
| `PENTOMINO_MAX_CHANCE` | `0.12` | tope |
| pesos dentro del grupo | U `0.4`, Y `0.4`, Plus `0.2` | el Plus es el más raro por ser el más difícil de encajar |
| `RING_MIN_LEVEL` / `RING_CHANCE` | `5` / `0.03` | el cuadro hueco no existe antes del nivel 5 |

Medido sobre 100 000 tiradas: 6 % de piezas especiales en el nivel 1, 11 % en el
5 y 15 % en el 15 — la inmensa mayoría siguen siendo clásicas.

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
