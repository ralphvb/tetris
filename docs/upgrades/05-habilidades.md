# 05 — Sistema de habilidades cargables

| | |
| - | - |
| **Subrama** | `upgrade/05-habilidades` |
| **Base del PR** | `feature/upgrades` |
| **Depende de** | [06 — Hold](06-hold.md) (la habilidad «reservar pieza» **es** el hold) |
| **Orden de merge** | **5.ª** |
| **Labels** | `enhancement`, `gameplay`, `controls`, `ui` |

## Objetivo

Una barra de energía que se llena al limpiar líneas y se gasta activando
habilidades. Convierte la puntuación en un recurso táctico.

## Alcance

Barra de energía (0–100) que sube al limpiar líneas —más por limpieza múltiple—
y cinco habilidades con coste:

| Tecla | Habilidad | Coste | Efecto |
| ----- | --------- | ----- | ------ |
| `1` | Ver 5 siguientes | 20 | muestra la cola de piezas futuras durante un rato |
| `2` | Cambiar pieza actual | 30 | descarta la pieza en juego y entra otra |
| `3` | Ralentizar tiempo | 40 | `dropInterval` ×2 durante 10 s |
| `4` | Deshacer última colocación | 60 | restaura el tablero previo al último `lockPiece` |
| `5` | Reservar pieza (hold) | 10 | reutiliza la mecánica de la mejora 06 |

## Diseño técnico

**Archivo nuevo:** `src/features/habilidades.js`.

### Energía

```js
let energia = 0;
on(EVENTS.RESET, () => { energia = 0; });
on(EVENTS.LINES_CLEAR, ({ cleared }) => {
  energia = Math.min(100, energia + [0, 8, 20, 35, 55][cleared]);
  updateHUD();
});
```

UI: un `<div class="panel-section">` con una barra (`<div class="energy-fill">`
con `style.width`) y `registerHudUpdater` para refrescarla. Usa variables CSS ya
existentes (`--value-color`, `--label-color`) para que el tema claro funcione sin
código extra.

### Activación

```js
bindKey('Digit1', () => usar(VER_5));
// …Digit2..Digit5
```

`usar(h)` comprueba energía, la descuenta, ejecuta el efecto y refresca el HUD.
Si no hay energía suficiente: parpadeo de la barra, nada más.

### Las cinco habilidades

- **Ver 5 siguientes.** Requiere una **cola** de piezas, y ahora mismo el motor
  solo guarda `state.next`. Cámbialo a `state.queue = [pieza, …]` con
  `state.next` como getter del primer elemento **o**, más simple y menos
  invasivo, mantén tu propia cola en el módulo y sustituye el selector con
  `setPieceSelector(() => cola.shift() ?? defaultPieceSelector())`. La segunda
  opción no toca `actions.js` y es la recomendada.
- **Cambiar pieza actual.** `state.current = randomPiece()` tras comprobar
  `collide()`; si colisiona, no gastes energía.
- **Ralentizar.** Guarda `state.dropInterval`, multiplícalo por 2 y restaura a
  los 10 s contando el tiempo en `EVENTS.TICK` (no con `setTimeout`: la pausa
  debe congelar la cuenta). Cuidado: si el nivel sube durante la ralentización,
  al restaurar hay que recalcular con `intervalForLevel(state.level)`
  (`src/scoring.js`), no con el valor guardado.
- **Deshacer.** Guarda una instantánea antes de cada fijado:
  ```js
  on(EVENTS.LOCK, () => {
    snapshot = {
      board: state.board.map(f => [...f]),   // copia profunda: la superficial
      score: state.score,                    // comparte las filas y no sirve
      lines: state.lines,
      level: state.level,
    };
  });
  ```
  Guarda **una sola** instantánea (deshacer un paso). El evento `LOCK` se emite
  después de `merge()`, así que para capturar el tablero *anterior* tendrás que
  hacer la copia en el `LOCK` previo o clonar en `EVENTS.SPAWN`. Decídelo y
  documéntalo en el PR.
- **Reservar pieza.** Llama a la función de la mejora 06. Expórtala desde
  `src/features/hold.js` (`export function hold()`) e impórtala aquí. **No la
  reimplementes**: si necesitas cambiar su firma, hazlo en un commit propio bien
  señalado.

## Criterios de aceptación

- [ ] La energía sube al limpiar líneas, más cuantas más líneas, con tope 100.
- [ ] Cada habilidad cuesta lo indicado y no se activa sin energía suficiente.
- [ ] La barra refleja el valor en todo momento y se ve en ambos temas.
- [ ] Ver-5 muestra piezas que luego salen **en ese orden**.
- [ ] Ralentizar respeta la pausa y termina restaurando la velocidad del nivel
      actual.
- [ ] Deshacer restaura tablero **y** marcadores, y solo un paso.
- [ ] Reservar usa la mecánica de la mejora 06, sin código duplicado.
- [ ] Las teclas no hacen nada en pausa ni tras Game Over.
- [ ] Todo el estado (energía, efectos activos, instantánea) se reinicia.
- [ ] Resto de la Definition of Done del [README](README.md).

## Notas de la implementación

Lo implementado en `src/features/habilidades.js` sigue el diseño de arriba con
estas decisiones concretas, donde el spec dejaba margen:

- **Ver 5 siguientes** usa la opción recomendada (cola propia + `setPieceSelector`
  envolviendo al selector activo, capturado una sola vez como `previousSelector`).
  Se mantiene visible **8 s** (`VER5_DURATION`), contadas por `EVENTS.TICK`.
- **Ralentizar** dura **10 s** (`RALENTIZAR_DURATION`) como pide el spec. El
  aviso sobre subir de nivel durante el efecto tenía un matiz no cubierto por el
  spec: `scoring.js` ya recalcula `state.dropInterval = intervalForLevel(nivel)`
  al emitir `LEVEL_UP`, así que el habilidades.js vuelve a doblarlo en un
  listener propio de `LEVEL_UP` mientras el efecto sigue activo, para que la
  ralentización no desaparezca a mitad de partida.
- **Deshacer** toma la instantánea en `EVENTS.SPAWN` (la opción B que menciona
  el spec): en ese momento el tablero ya refleja el resultado del último
  `lockPiece`, así que es exactamente lo que hay que restaurar. Guarda también
  `dropInterval`, no solo tablero/marcadores.
- **Cambiar pieza** y **Ver 5** comparten el mismo selector envuelto: si se usa
  "cambiar pieza" mientras la cola de "ver 5" tiene elementos, consume el
  primero de la cola en vez de generar una pieza totalmente nueva — evita que
  la vista previa se desincronice de lo que realmente va a salir.
- El parpadeo de energía insuficiente es una animación CSS (`.energy-fill.flash`),
  no un `setTimeout` que cuente tiempo de juego: es puramente cosmético.

## Pruebas manuales

1. Limpia líneas hasta llenar la barra; comprueba el tope en 100.
2. Activa cada habilidad con energía justa y con energía insuficiente.
3. Ralentizar → pausar 5 s → reanudar: debe quedar el tiempo que faltaba.
4. Ralentizar y subir de nivel durante el efecto → al acabar, la velocidad debe
   ser la del nivel nuevo.
5. Deshacer justo después de un Tetris → tablero y puntuación vuelven atrás.
6. Deshacer dos veces seguidas → la segunda no debe hacer nada raro.
7. Reiniciar con efectos activos → todo limpio.
