# 03 — Modo combo y multiplicadores

| | |
| - | - |
| **Subrama** | `upgrade/03-combos` |
| **Base del PR** | `feature/upgrades` |
| **Depende de** | nada |
| **La necesitan** | [01 — Power-ups](01-powerups.md), [04 — Desafíos](04-desafios.md) |
| **Orden de merge** | **3.ª** |
| **Labels** | `enhancement`, `scoring`, `rendering` |

## Objetivo

Premiar el juego encadenado: limpiar líneas en turnos consecutivos, hacer
T-spins, encadenar Tetris y dejar el tablero vacío deben valer mucho más que
limpiar líneas sueltas.

## Alcance

| Bonus | Cuándo | Efecto sugerido |
| ----- | ------ | --------------- |
| **Combo** | limpiar líneas en piezas consecutivas | ×2, ×3, ×4… (tope ×8) |
| **T-spin** | la pieza T rota para encajar y limpia líneas | +400 × nivel |
| **Back-to-back** | dos Tetris (o T-spins) seguidos sin limpiezas normales entre medias | +50 % |
| **Perfect Clear** | el tablero queda completamente vacío | +2000 × nivel |

Más: aviso visual al encadenar (texto flotante «COMBO ×3», «T-SPIN!») y
marcador de combo en el panel.

Audio: opcional. Si lo añades, que sea un `AudioContext` con un beep sintetizado
(nada de archivos binarios en el repo) y **silenciable**.

## Diseño técnico

**Archivo nuevo:** `src/features/combos.js`.

### Estado

Todo dentro del módulo, limpiado con `EVENTS.RESET`:

```js
let combo = -1;        // -1 = sin combo; sube con cada pieza que limpia líneas
let backToBack = false;
let ultimoFueDificil = false;
```

### Los ganchos

1. **Multiplicador** — `addScoreModifier` (`src/scoring.js`). El modificador
   recibe los puntos base ya multiplicados por el nivel y el contexto de la
   jugada (`{ cleared, rows, piece }`), y devuelve los puntos finales:

   ```js
   addScoreModifier((puntos, { cleared, piece }) => {
     let total = puntos;
     if (combo > 0) total *= Math.min(1 + combo, 8);
     if (esTSpin(piece)) total += 400 * state.level;
     if (backToBack && cleared === 4) total *= 1.5;
     if (isEmptyBoard()) total += 2000 * state.level;
     return Math.round(total);
   });
   ```

   Ojo al orden: los modificadores se aplican **antes** de sumar al marcador, así
   que aquí `state.lines` todavía no incluye la limpieza en curso.

2. **Contador de combo** — hay que subirlo cuando una pieza limpia y **romperlo
   cuando una pieza se fija sin limpiar**. Esa segunda mitad es la que se olvida.

   Implementado: el incremento **no** ocurre en el handler de `LINES_CLEAR`
   sino dentro del propio modificador de puntuación, porque `addScoreModifier`
   se llama *antes* de que se emita `LINES_CLEAR` (ver `addLineClearScore` en
   `src/scoring.js`) y este clear debe contar para el multiplicador de sí
   mismo, no para el siguiente:

   ```js
   let limpioEsteLock = false;
   on(EVENTS.LOCK, () => { limpioEsteLock = false; });      // se emite ANTES
   on(EVENTS.LINES_CLEAR, () => { limpioEsteLock = true; }); // solo marca, no incrementa
   on(EVENTS.SPAWN, () => { if (!limpioEsteLock) combo = -1; });

   addScoreModifier((puntos, { cleared }) => {
     combo++; // -1→0 en el primer clear (sin bono), 0→1 en el segundo (×2)…
     let total = puntos;
     if (combo > 0) total *= Math.min(1 + combo, 8);
     // …
     return Math.round(total);
   });
   ```

   El orden real de emisión en `lockPiece()` (`src/actions.js`) es
   `LOCK → LINES_CLEAR → SPAWN`, pero el modificador de puntuación corre
   *dentro* del tramo `LOCK → LINES_CLEAR` (lo llama `addLineClearScore`).
   Incrementar `combo` en el handler de `LINES_CLEAR`, como sugería la versión
   original de este documento, deja el multiplicador un clear por detrás
   (el segundo clear de la racha saldría a ×1 en vez de ×2). Léelo antes de
   escribir la máquina de estados.

3. **Perfect Clear** — `isEmptyBoard()` ya existe en `src/board.js`.

4. **T-spin** — necesita saber que la última acción fue una rotación. Detección
   práctica (regla de las 3 esquinas): la pieza es de tipo T, el último
   movimiento fue `rotate()`, y al menos 3 de las 4 esquinas de su caja 3×3 están
   ocupadas o fuera del tablero. Marca la bandera desde tu propio wrapper de la
   tecla de rotación (`bindKey('ArrowUp', …)` re-vinculando y llamando a
   `rotate()`), y bórrala en cualquier otro movimiento.

5. **Avisos en pantalla** — `registerPainter((ctx) => …)` en `src/render.js`.
   Un texto con opacidad decreciente durante ~700 ms; guarda el instante en una
   variable del módulo y compara con `performance.now()`. `draw()` repinta cada
   frame, así que la animación sale sola.

6. **Marcador de combo** — `registerHudUpdater` + un `<div class="panel-section">`
   nuevo en `index.html`. Muéstralo solo cuando `combo > 0`.

## Criterios de aceptación

- [ ] Limpiar en piezas consecutivas multiplica la puntuación de forma creciente
      y el marcador lo refleja.
- [ ] Fijar una pieza sin limpiar rompe el combo (vuelve a ×1).
- [ ] El multiplicador tiene tope y no desborda la puntuación.
- [ ] Un T-spin con líneas concede el bonus; una rotación normal, no.
- [ ] Dos Tetris seguidos dan back-to-back; un Tetris + una línea simple lo rompe.
- [ ] Vaciar el tablero da Perfect Clear una sola vez.
- [ ] Los avisos se dibujan encima del tablero, no tapan la pieza y desaparecen.
- [ ] Todo el estado se reinicia al empezar partida nueva.
- [ ] Resto de la Definition of Done del [README](README.md).

## Pruebas manuales

1. Limpia líneas en tres piezas seguidas → ×2, ×3 y puntuación acorde.
2. Fija una pieza sin limpiar → el combo desaparece.
3. Prepara un pozo y haz dos Tetris seguidos → back-to-back.
4. Deja una T encajable en un hueco en L, rota dentro y limpia → T-spin.
5. Vacía el tablero por completo → Perfect Clear.
6. Reinicia en mitad de un combo alto → contador a cero.

## Riesgo de conflicto

Esta rama y [01 — Power-ups](01-powerups.md) tocan la misma zona de puntuación.
Por eso 03 se mergea antes: los power-ups conceden sus puntos **a través** del
sistema de modificadores que se define aquí, no en paralelo.
