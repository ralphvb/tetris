'use strict';

import { state } from './state.js';
import { collide, merge, clearLines } from './board.js';
import { randomPiece, tryRotate, ghostY } from './pieces.js';
import { addLineClearScore, addSoftDropScore, addHardDropScore } from './scoring.js';
import { updateHUD } from './hud.js';
import { EVENTS, emit } from './events.js';

// Acciones del jugador y ciclo de vida de la pieza. Es la capa que las teclas
// (input.js) y las mejoras invocan; no dibuja ni gestiona el bucle.

export function moveLeft() {
  if (collide(state.current.shape, state.current.x - 1, state.current.y)) return false;
  state.current.x--;
  return true;
}

export function moveRight() {
  if (collide(state.current.shape, state.current.x + 1, state.current.y)) return false;
  state.current.x++;
  return true;
}

export function rotate() {
  return tryRotate(state.current);
}

export function softDrop() {
  if (!collide(state.current.shape, state.current.x, state.current.y + 1)) {
    state.current.y++;
    addSoftDropScore();
    updateHUD();
    return;
  }
  lockPiece();
}

export function hardDrop() {
  const gy = ghostY(state.current);
  addHardDropScore(gy - state.current.y);
  state.current.y = gy;
  lockPiece();
}

// Fija la pieza actual: volcarla al tablero → limpiar líneas → generar la
// siguiente. Los eventos LOCK y LINES_CLEAR se emiten aquí; es el gancho que
// usan power-ups, combos y habilidades.
export function lockPiece() {
  const piece = state.current;
  merge(piece);
  emit(EVENTS.LOCK, { piece });

  const { cleared, rows } = clearLines();
  if (cleared) {
    addLineClearScore(cleared, { piece, rows });
    emit(EVENTS.LINES_CLEAR, { cleared, rows, piece });
  }
  updateHUD();

  spawn();
}

// Promueve `next` a `current` y genera la siguiente. Si la pieza recién
// promovida ya colisiona, la partida termina.
export function spawn() {
  state.current = state.next;
  if (collide(state.current.shape, state.current.x, state.current.y)) {
    endGame();
    return;
  }
  state.next = randomPiece();
  emit(EVENTS.SPAWN, { piece: state.current });
}

export function endGame() {
  state.gameOver = true;
  emit(EVENTS.GAME_OVER, {});
}

export function togglePause() {
  if (state.gameOver) return;
  state.paused = !state.paused;
  emit(state.paused ? EVENTS.PAUSE : EVENTS.RESUME, {});
}
