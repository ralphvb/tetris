'use strict';

// Bus de eventos mínimo del juego.
//
// Existe para que las mejoras nuevas se enganchen al ciclo de vida de la partida
// SIN editar actions.js ni main.js: una feature se suscribe a lo que le interesa
// (`on(EVENTS.LINES_CLEAR, ...)`) desde su propio módulo en src/features/.
//
// Regla: los eventos son notificaciones, no preguntas. Un handler puede leer y
// mutar `state`, pero no puede cancelar la acción que lo emitió.

export const EVENTS = {
  RESET: 'reset',             // { }              partida reiniciada (tras resetState)
  SPAWN: 'spawn',             // { piece }        nueva pieza promovida a current
  LOCK: 'lock',               // { piece }        pieza fijada en el tablero (antes de limpiar líneas)
  LINES_CLEAR: 'lines-clear', // { cleared, rows } se han eliminado líneas
  LEVEL_UP: 'level-up',       // { level }        el nivel ha subido
  PAUSE: 'pause',             // { }              partida pausada
  RESUME: 'resume',           // { }              partida reanudada
  GAME_OVER: 'game-over',     // { }              fin de partida
  TICK: 'tick',               // { dt }           un frame del bucle
  THEME_CHANGE: 'theme',      // { theme }        tema claro/oscuro aplicado
};

const handlers = new Map();

export function on(event, fn) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(fn);
  return () => off(event, fn);
}

export function off(event, fn) {
  handlers.get(event)?.delete(fn);
}

export function emit(event, payload = {}) {
  const set = handlers.get(event);
  if (!set) return;
  for (const fn of [...set]) fn(payload);
}
