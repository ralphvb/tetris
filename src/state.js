'use strict';

import { COLS, ROWS, BASE_DROP_INTERVAL } from './config.js';

// Estado mutable de la partida.
//
// PUNTO DE EXTENSIÓN — estado nuevo:
// Toda mejora que necesite recordar algo entre frames añade su campo AQUÍ y lo
// reinicia en resetState(). Si no se reinicia, el valor se filtra a la siguiente
// partida (bug clásico de este proyecto).
//
// Se exporta un objeto y no variables sueltas a propósito: los bindings `let`
// exportados son de solo lectura para quien importa, así que un objeto mutado
// in situ es la única forma de compartir estado entre módulos.

export const state = {
  board: [],          // matriz ROWS × COLS; 0 = vacío, 1..N = tipo de pieza
  current: null,      // { type, shape, x, y }
  next: null,         // { type, shape, x, y }
  hold: null,         // pieza reservada (mejora 06); null = reserva vacía
  holdUsed: false,    // ¿ya se reservó con la pieza en juego?
  score: 0,
  lines: 0,
  level: 1,
  paused: false,
  gameOver: false,
  lastTime: 0,        // timestamp del último frame (rAF)
  dropAccum: 0,       // ms acumulados desde la última bajada
  dropInterval: BASE_DROP_INTERVAL,
  animId: 0,          // id de requestAnimationFrame en curso
};

export function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

// Deja el estado como al arrancar. NO toca animId: de cancelar el bucle
// anterior se encarga init() en main.js.
export function resetState() {
  state.board = createBoard();
  state.current = null;
  state.next = null;
  state.hold = null;
  state.holdUsed = false;
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.paused = false;
  state.gameOver = false;
  state.lastTime = 0;
  state.dropAccum = 0;
  state.dropInterval = BASE_DROP_INTERVAL;
}
