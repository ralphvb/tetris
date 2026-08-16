# 04 — Modo desafío con objetivos

| | |
| - | - |
| **Subrama** | `upgrade/04-desafios` |
| **Base del PR** | `feature/upgrades` |
| **Depende de** | [01](01-powerups.md), [02](02-piezas-nuevas.md), [03](03-combos.md) |
| **Orden de merge** | **6.ª (última)** |
| **Labels** | `enhancement`, `gameplay`, `ui` |

## Objetivo

Un modo alternativo al juego infinito: niveles con un objetivo concreto, una
condición de victoria y una de derrota.

## Alcance

Los cinco desafíos del gist:

| Desafío | Objetivo | Modificación del juego |
| ------- | -------- | ---------------------- |
| **Sprint** | 40 líneas en 2 minutos | temporizador visible |
| **Basura** | sobrevivir | cada 10 s sube una fila de basura desde abajo |
| **Tablero sembrado** | limpiar N líneas | la partida empieza con bloques colocados |
| **Piezas invisibles** | limpiar N líneas | los bloques se ocultan al fijarse |
| **Rotación invertida** | llegar a nivel N | a partir de cierto nivel, la rotación gira al revés |

Selector de modo en la pantalla inicial u overlay, y overlay de victoria/derrota
con el resultado.

## Diseño técnico

**Archivos nuevos:** `src/features/desafios.js` y, si crece, un
`src/features/desafios/` con un archivo por desafío.

Esta mejora es la más transversal del roadmap: por eso va la última, cuando el
resto de mecánicas ya están estables y se pueden reutilizar.

### Modelo de un desafío

Define los desafíos como datos, no como cinco ramas de `if`:

```js
const DESAFIOS = {
  sprint: {
    nombre: 'Sprint 40',
    descripcion: 'Limpia 40 líneas en 2 minutos',
    setup() { /* preparar tablero/estado */ },
    tick(dt) { /* temporizador */ },
    victoria: () => state.lines >= 40,
    derrota: () => tiempoRestante <= 0,
    hud: () => `${state.lines}/40 · ${formatoTiempo(tiempoRestante)}`,
  },
  // …
};
```

El runner: `setup()` en `EVENTS.RESET`, `tick(dt)` en `EVENTS.TICK`, y tras cada
`EVENTS.LINES_CLEAR` / `TICK` comprobar `victoria()` y `derrota()`.

### Cómo implementar cada desafío sin tocar el motor

- **Temporizador** → acumular `dt` en `EVENTS.TICK`. Nunca `setInterval`: la
  pausa debe detenerlo.
- **Basura periódica** → cada 10 s, `state.board.shift()` y `push()` de una fila
  casi llena con un hueco aleatorio. **Cuidado**: hay que comprobar si la pieza
  actual queda incrustada tras el desplazamiento y subirla o terminar la partida.
- **Tablero sembrado** → escribir en `state.board` dentro de `setup()`, que corre
  justo después de `resetState()` y antes de la primera pieza.
- **Piezas invisibles** → un `registerPainter` que tape el tablero repintando el
  fondo sobre las celdas fijadas. Es más limpio que modificar `draw()`: el
  painter se ejecuta al final del frame y puede borrar lo ya pintado.
- **Rotación invertida** → re-vincula la tecla con `bindKey('ArrowUp', …)` y
  llama a `tryRotate(state.current, rotateCCW)`; `rotateCCW` ya existe en
  `src/pieces.js`. Recuerda restaurar el binding original al salir del modo.

### Victoria y derrota

`showOverlay(titulo, subtitulo)` y `hideOverlay()` ya existen en `src/hud.js`, y
`endGame()` en `src/actions.js` para la derrota. Para la victoria querrás parar
el bucle sin el texto de «GAME OVER»: emite tu propio final llamando a
`endGame()` y sustituyendo el texto del overlay desde tu handler de
`EVENTS.GAME_OVER` (los handlers se ejecutan en orden de registro; el tuyo, al
registrarse después, escribe el último).

Si esto queda forzado, es señal de que hace falta un gancho de verdad en el
motor: ábrelo como PR aparte contra `feature/upgrades` («permitir texto de fin
de partida personalizado») en vez de parchearlo desde la feature.

### Selección de modo

Añade en el overlay inicial una lista de modos, más un modo `clasico` (el actual)
que debe ser **el de por defecto**: sin elegir nada, el juego se comporta
exactamente como hoy.

## Criterios de aceptación

- [ ] Los cinco desafíos son jugables, con victoria y derrota diferenciadas.
- [ ] El modo clásico sigue intacto y es el predeterminado.
- [ ] El objetivo y el progreso se ven en el panel en todo momento.
- [ ] Los temporizadores se detienen con `P` y se reinician al empezar de nuevo.
- [ ] La basura no incrusta ni destruye la pieza en juego.
- [ ] Con piezas invisibles, el fantasma y la pieza actual siguen viéndose.
- [ ] Cambiar de desafío no arrastra estado del anterior.
- [ ] Resto de la Definition of Done del [README](README.md).

## Pruebas manuales

1. Cada desafío: ganarlo y perderlo, comprobando ambos overlays.
2. Sprint: pausar a mitad → el reloj se detiene.
3. Basura: dejar la pila alta y esperar a que suba una fila → comportamiento
   correcto, sin bloques atravesados.
4. Invisibles: comprobar que se puede seguir jugando con el fantasma.
5. Rotación invertida: alcanzar el nivel del cambio y verificar el giro; volver
   al modo clásico y comprobar que la rotación es la normal otra vez.
6. Jugar clásico → desafío → clásico sin recargar la página.
