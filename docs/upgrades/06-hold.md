# 06 — Sistema de Hold (reserva de pieza)

| | |
| - | - |
| **Subrama** | `upgrade/06-hold` |
| **Base del PR** | `feature/upgrades` |
| **Depende de** | nada |
| **La necesitan** | [05 — Habilidades](05-habilidades.md) |
| **Orden de merge** | **1.ª** |
| **Labels** | `enhancement`, `gameplay`, `controls` |

## Objetivo

Permitir guardar la pieza actual en una reserva para usarla más tarde, la
mecánica estándar del Tetris moderno. Es la mejora más pequeña del roadmap y la
que **fija el patrón** que seguirán las demás: estado nuevo, tecla nueva, panel
lateral nuevo, todo desde un único módulo en `src/features/`.

## Alcance

- Guardar la pieza actual con `C` (y `Shift` como alias).
- La primera vez: la pieza actual va a la reserva y entra la siguiente.
- Las siguientes: la pieza actual y la reservada se intercambian.
- **Un solo uso por pieza**: tras reservar no se puede volver a reservar hasta
  que la pieza en juego se fije. Sin esta regla, el hold permite congelar la
  partida indefinidamente.
- Panel `HOLD` en la barra lateral con la pieza reservada dibujada.
- Indicador visual de bloqueo (panel atenuado) cuando el hold no está disponible.

Fuera de alcance: gastar la reserva como habilidad con coste de energía (eso es
la mejora 05, que reutilizará esta API).

## Diseño técnico

**Archivo nuevo:** `src/features/hold.js` con `export function registerHold()`.

### Estado

Dos campos, en el módulo o en `state` (recomendado en `state`, porque la mejora
05 querrá leerlos):

```js
state.hold = null;       // { type, shape, x, y } o null
state.holdUsed = false;  // ¿ya se reservó con la pieza actual?
```

Si los pones en `state`, añádelos también a `resetState()` en `src/state.js`.
Si los dejas en el módulo, límpialos con `on(EVENTS.RESET, …)`.

### Lógica

```js
function hold() {
  if (state.holdUsed || state.gameOver || state.paused) return;

  const guardada = state.hold;
  // Al reservar, la pieza vuelve a su posición y orientación de salida:
  // guardar una pieza rotada y sacarla incrustada en el tablero es un bug.
  state.hold = makePiece(state.current.type);

  if (guardada) {
    state.current = guardada;
  } else {
    spawn();                 // sin reserva previa: entra la siguiente
  }
  state.holdUsed = true;
  // …repintar el panel de hold
}
```

Puntos de apoyo que ya existen:

- `makePiece(type)` en `src/pieces.js` — crea la pieza limpia y centrada.
- `spawn()` en `src/actions.js` — promueve `next` y emite `EVENTS.SPAWN`.
- `drawPieceIn(ctx, canvas, shape)` en `src/render.js` — dibuja una pieza
  centrada en un canvas auxiliar; es exactamente lo que necesita el panel HOLD.

### Ganchos

| Gancho | Para qué |
| ------ | -------- |
| `bindKey('KeyC', hold)` y `bindKey('ShiftLeft'/'ShiftRight', hold)` | la tecla |
| `on(EVENTS.LOCK, …)` | poner `holdUsed = false`: la pieza se fijó, vuelve a haber reserva |
| `on(EVENTS.RESET, …)` | vaciar la reserva al empezar partida |
| `on(EVENTS.THEME_CHANGE, …)` | repintar el canvas de HOLD al cambiar de tema |

**Cuidado con el intercambio y la colisión**: al meter la pieza reservada puede
que colisione ya (tablero muy alto). Comprueba con `collide()` antes de asignar;
si colisiona, lo coherente es terminar la partida con `endGame()`.

### UI

En `index.html`, dentro de `<aside class="panel">`, un bloque nuevo **antes** del
de NEXT (es donde lo espera un jugador de Tetris):

```html
<div class="panel-section" id="hold-section">
  <span class="label">HOLD</span>
  <canvas id="hold-canvas" width="120" height="120"></canvas>
</div>
```

En `style.css`, reutiliza los estilos de `#next-canvas` y añade el estado
bloqueado con variables existentes:

```css
#hold-section.blocked { opacity: 0.4; }
```

Y en la lista de controles del panel: `<li><kbd>C</kbd> reservar</li>`.

## Criterios de aceptación

- [x] `C` con la reserva vacía guarda la pieza y hace entrar la siguiente.
- [x] `C` con reserva llena intercambia; la pieza que sale lo hace **sin rotar**
      y centrada arriba.
- [x] No se puede reservar dos veces seguidas sin que se haya fijado una pieza.
- [x] El panel HOLD muestra la pieza y se atenúa cuando está bloqueado.
- [x] `C` no hace nada en pausa ni tras Game Over.
- [x] Reiniciar vacía la reserva.
- [x] La reserva se ve correctamente en tema claro y oscuro.
- [x] Resto de la Definition of Done del [README](README.md).

## Cómo quedó implementada

Sin desviaciones respecto a este spec. Detalles de la implementación:

- `state.hold` y `state.holdUsed` viven en `src/state.js` y se reinician en
  `resetState()`, para que la mejora 05 pueda leerlos.
- `src/features/hold.js` exporta `registerHold()` y también `hold()`, que es la
  función que reutilizará la mejora 05 cobrando energía por llamarla.
- El repintado del panel va por `registerHudUpdater()`: `updateHUD()` ya se
  llama tras cada tecla, al fijar una pieza y al arrancar la partida. `RESET` y
  `THEME_CHANGE` lo repintan aparte, porque ahí el bucle puede estar parado.
- En el intercambio se asigna primero y se comprueba `collide()` después, igual
  que hace `spawn()`: `draw()` no pinta la pieza actual tras el game over, así
  que no queda ninguna incrustada.

## Pruebas manuales

1. `python3 -m http.server 8000`, abrir `http://localhost:8000`.
2. Pulsar `C` al empezar → la pieza se va al panel HOLD, entra la siguiente.
3. Pulsar `C` otra vez inmediatamente → no pasa nada, panel atenuado.
4. Dejar caer la pieza → el panel se reactiva.
5. Pulsar `C` → intercambio correcto, la pieza sale en posición de salida.
6. Rotar una pieza, pulsar `C`, sacarla después → debe salir sin rotar.
7. Apilar hasta casi arriba y pulsar `C` con una pieza grande reservada →
   comprobar que el Game Over se dispara bien y no queda una pieza incrustada.
8. Reiniciar → HOLD vacío.
