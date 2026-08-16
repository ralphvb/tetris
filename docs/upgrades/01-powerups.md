# 01 — Power-ups aleatorios

| | |
| - | - |
| **Subrama** | `upgrade/01-powerups` |
| **Base del PR** | `feature/upgrades` |
| **Depende de** | [03 — Combos](03-combos.md) (puntuación por modificadores) |
| **Orden de merge** | **4.ª** |
| **Labels** | `enhancement`, `gameplay`, `rendering` |

## Objetivo

Introducir piezas especiales que, al fijarse, disparan un efecto sobre el
tablero. Aparecen de vez en cuando tras limpiar cierto número de líneas y rompen
la rutina del apilado.

## Alcance

| Power-up | Efecto al fijarse |
| -------- | ----------------- |
| **Bomba** | destruye un área 3×3 alrededor de donde cayó |
| **Rayo** | limpia la fila y la columna completas de su posición |
| **Tinte** | convierte todos los bloques de un color en comodines (encajan con cualquier color a efectos de la mecánica que definas) |
| **Gravedad** | compacta el tablero: todos los bloques caen y se eliminan los huecos |
| **Congelar** | detiene la caída durante 5 segundos |

Aparición sugerida: se concede un power-up cada N líneas limpiadas (p. ej. 10),
eligiendo el tipo al azar; nunca dos seguidos.

## Diseño técnico

**Archivo nuevo:** `src/features/powerups.js`.

Dos piezas de este puzzle ya existen en el motor y conviene usarlas en vez de
reinventarlas:

- `setPieceSelector(fn)` (`src/pieces.js`) para inyectar la pieza especial.
- `clearCell(r, c)` y `isEmptyBoard()` (`src/board.js`) para tocar el tablero.

### Cómo representar un power-up

Dos caminos; elige uno y déjalo escrito en el PR:

**A. Tipo de pieza propio** (recomendado). Añades entradas en `COLORS`/`PIECES`
(`src/config.js`) igual que la mejora 02, con forma 1×1 o 2×2, y un mapa
`TIPO_PIEZA → efecto` en tu módulo. Ventaja: `merge()`, `collide()` y el dibujado
funcionan sin tocarlos, y la vista NEXT lo muestra gratis.

**B. Marca sobre una pieza normal**: `state.current.powerup = 'bomba'`. Ventaja:
no crece `config.js`. Inconveniente: hay que pintar el distintivo a mano con un
painter y la marca puede perderse en el hold o el intercambio.

> Si eliges A, coordínate con la rama 02: ambas amplían las mismas listas. Mergea
> 02 primero y rebasa.

### Disparar el efecto

```js
on(EVENTS.LOCK, ({ piece }) => {
  const efecto = efectoDe(piece);
  if (!efecto) return;
  efecto(piece);              // muta state.board
  activarAnimacion(piece);
});
```

`EVENTS.LOCK` se emite en `lockPiece()` (`src/actions.js`) **después** de
`merge()` y **antes** de `clearLines()`. Es el momento correcto: el efecto
modifica el tablero y la limpieza de líneas posterior ya ve el resultado —
incluidas las filas que el propio power-up haya completado.

### Los cinco efectos

- **Bomba / Rayo** → bucles sobre `clearCell()`. Deja huecos flotantes: es
  aceptable en Tetris clásico, pero decide y documenta si prefieres compactar.
- **Gravedad** → por cada columna, recoge los valores no nulos y reescríbelos
  desde abajo. Es la operación que más fácil rompe el tablero: escríbela aparte y
  pruébala con un tablero preparado a mano.
- **Tinte** → necesita un valor de celda «comodín». Puedes reservar un índice de
  color extra en `COLORS` y decidir que ese valor cuenta como lleno en
  `clearLines()` (ya lo hace: cualquier valor ≠ 0 cuenta).
- **Congelar** → **no toques el bucle de `main.js`**. La forma limpia es guardar
  `state.dropInterval`, ponerlo a `Infinity` (o marcar una bandera y devolver
  `dropAccum` a 0 en cada tick) y restaurarlo con un `setTimeout` de 5 s.
  Obligatorio: cancelar el timeout en `EVENTS.RESET` y en `EVENTS.GAME_OVER`, y
  tener en cuenta la pausa — si el jugador pausa 3 s, el congelado no debería
  gastarse. Lo más simple es contar el tiempo en `EVENTS.TICK` en vez de con
  `setTimeout`.

### Feedback visual

`registerPainter` para la onda expansiva de la bomba, el destello del rayo y un
marco azulado mientras dure el congelado. Todo con temporizador propio en el
módulo comparado contra `performance.now()`.

### Puntuación

Los puntos que concedan los power-ups pasan por el sistema de la mejora 03
(`addScoreModifier`) o se suman directamente a `state.score` seguidos de
`updateHUD()`. No dupliques la lógica de multiplicadores.

## Criterios de aceptación

- [ ] Los cinco power-ups aparecen, se distinguen visualmente y su efecto es el
      descrito.
- [ ] El efecto ocurre al **fijarse** la pieza, no al aparecer.
- [ ] Las líneas que un power-up completa se limpian y puntúan con normalidad.
- [ ] Gravedad no pierde ni duplica bloques (cuenta bloques antes y después).
- [ ] Congelar dura 5 s reales, no se acumula si caen dos seguidos, no sobrevive
      a un reinicio y no corre durante la pausa.
- [ ] Ningún power-up puede dejar la partida en un estado sin salida ni provocar
      un Game Over injusto.
- [ ] Las animaciones no bloquean el juego ni bajan de 60 fps.
- [ ] Resto de la Definition of Done del [README](README.md).

## Notas de implementación

Lo implementado en `upgrade/01-powerups` sigue el diseño de este documento con
estas decisiones concretas:

- **Camino A** (tipo de pieza propio): índices 13–17 en `COLORS`/`PIECES`, 1×1
  como el Punto de la mejora 02. El índice 18 es el «comodín» que deja el
  Tinte — nunca sale como pieza, solo como celda del tablero.
- **Selector envuelto, no sustituido**: `pieces.js` gana `getPieceSelector()`
  (además de `setPieceSelector()` ya existente) para que este módulo pueda
  capturar el selector activo de la mejora 02 y delegar en él cuando no toca
  conceder un power-up. En `features/index.js`, `registerPowerups` se activa
  **después** de `registerPiezasNuevas` por esto mismo.
- **Concesión**: cada 10 líneas limpiadas (`POWERUP_LINES`), la siguiente
  pieza es un power-up cuyo tipo se sortea evitando repetir el anterior.
- **Congelar**: cuenta el tiempo en `EVENTS.TICK` y pone `dropAccum` a 0 en
  cada tick mientras dura, sin tocar `dropInterval` ni el bucle. Como `TICK`
  solo se emite mientras `main.js` corre el `requestAnimationFrame`, la pausa
  lo detiene gratis y un segundo Congelar antes de que expire el primero
  simplemente refresca los 5 s en vez de acumularlos.
- **Puntuación**: cada efecto suma `150 × nivel` directamente a `state.score`
  (no usa `addScoreModifier`, porque no es un multiplicador de la limpieza de
  líneas sino un bono fijo del propio power-up).
- **Feedback visual**: un `registerPainter` dibuja la onda de la Bomba, el
  destello en cruz del Rayo, un marco azulado mientras dura Congelar y el
  nombre del power-up disparado, todo con temporizador propio comparado
  contra `performance.now()`.

## Pruebas manuales

1. Fuerza cada power-up de uno en uno (selector fijo) y verifica su efecto.
2. Bomba en una esquina y pegada a los bordes → sin errores de índice.
3. Rayo en la fila 0 y en la 19.
4. Gravedad sobre un tablero con muchos huecos → cuenta los bloques antes y
   después: deben ser los mismos.
5. Congelar y pulsar `P` en mitad → al reanudar debe seguir congelado el tiempo
   que faltaba.
6. Congelar y reiniciar antes de que acabe → la partida nueva arranca a velocidad
   normal.
