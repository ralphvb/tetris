'use strict';

import { COLS, ROWS, BLOCK } from '../config.js';
import { state } from '../state.js';
import { isEmptyBoard } from '../board.js';
import { moveLeft, moveRight, rotate, softDrop, hardDrop } from '../actions.js';
import { EVENTS, on } from '../events.js';
import { bindKey } from '../input.js';
import { registerPainter } from '../render.js';
import { registerHudUpdater } from '../hud.js';
import { addScoreModifier } from '../scoring.js';

// Mejora 03 — Modo combo y multiplicadores (docs/upgrades/03-combos.md).
//
// Premia el juego encadenado: combo de limpiezas consecutivas, T-spin,
// back-to-back de Tetris/T-spin y Perfect Clear. Todo el estado vive aquí,
// limpiado con EVENTS.RESET.

const T_TYPE = 3; // índice de la pieza T en PIECES/COLORS (config.js)

const COMBO_CAP = 8;
const TSPIN_BONUS = 400;
const BACK_TO_BACK_MULT = 1.5;
const PERFECT_CLEAR_BONUS = 2000;
const TOAST_DURATION = 700; // ms

let combo = -1;          // -1 = sin combo; sube con cada pieza que limpia líneas
let backToBack = false;  // el último "clear difícil" (Tetris/T-spin) no se rompió
let limpioEsteLock = false; // ¿la pieza que se acaba de fijar limpió líneas?
let lastMoveWasRotate = false; // ¿la última acción sobre la pieza actual fue rotar?
let tSpinPending = false;      // ¿la pieza recién fijada cumple la regla de las 3 esquinas?

const toasts = []; // { text, start } — avisos flotantes sobre el tablero

function reset() {
  combo = -1;
  backToBack = false;
  limpioEsteLock = false;
  lastMoveWasRotate = false;
  tSpinPending = false;
  toasts.length = 0;
}

function pushToast(text) {
  toasts.push({ text, start: performance.now() });
}

// Regla de las 3 esquinas: la pieza es una T, el último movimiento fue una
// rotación, y al menos 3 de las 4 esquinas de su caja 3×3 están ocupadas
// (por bloques fijados o por estar fuera del tablero).
function isTSpin(piece) {
  if (piece.type !== T_TYPE || !lastMoveWasRotate) return false;
  const corners = [
    [piece.x, piece.y],
    [piece.x + 2, piece.y],
    [piece.x, piece.y + 2],
    [piece.x + 2, piece.y + 2],
  ];
  let occupied = 0;
  for (const [x, y] of corners) {
    const fuera = x < 0 || x >= COLS || y < 0 || y >= ROWS;
    if (fuera || state.board[y][x]) occupied++;
  }
  return occupied >= 3;
}

export function registerCombos() {
  on(EVENTS.RESET, reset);

  // --- Rastro de "última acción fue rotar", para el T-spin ------------------
  // Re-vincula las teclas de movimiento y rotación (input.js ya las tiene
  // asignadas; bindKey() sustituye el binding sin tocar input.js).
  bindKey('ArrowUp', () => { if (rotate()) lastMoveWasRotate = true; });
  bindKey('KeyX', () => { if (rotate()) lastMoveWasRotate = true; });
  bindKey('ArrowLeft', () => { lastMoveWasRotate = false; return moveLeft(); });
  bindKey('ArrowRight', () => { lastMoveWasRotate = false; return moveRight(); });
  bindKey('ArrowDown', () => { lastMoveWasRotate = false; softDrop(); });
  bindKey('Space', () => { lastMoveWasRotate = false; hardDrop(); }, { preventDefault: true });

  // --- Máquina de estados del combo -----------------------------------------
  // Orden real de emisión en lockPiece(): LOCK → LINES_CLEAR → SPAWN.
  on(EVENTS.LOCK, ({ piece }) => {
    tSpinPending = isTSpin(piece);
    limpioEsteLock = false;
  });
  on(EVENTS.LINES_CLEAR, () => { limpioEsteLock = true; });
  on(EVENTS.SPAWN, () => {
    lastMoveWasRotate = false; // la pieza nueva todavía no se ha movido
    // Solo se rompe el combo. El back-to-back sobrevive a piezas que no
    // limpian nada: solo lo rompe una limpieza "normal" (ver el modificador).
    if (!limpioEsteLock) combo = -1;
  });

  // --- Multiplicador de puntuación ------------------------------------------
  addScoreModifier((points, { cleared }) => {
    // El combo sube aquí (no en LINES_CLEAR) para que ya cuente en ESTE clear:
    // -1 → 0 en el primer clear (sin bono), 0 → 1 en el segundo (×2)...
    combo++;
    let total = points;

    if (combo > 0) {
      const mult = Math.min(1 + combo, COMBO_CAP);
      total *= mult;
      pushToast(`COMBO ×${mult}`);
    }

    const spin = tSpinPending && cleared > 0;
    if (spin) {
      total += TSPIN_BONUS * state.level;
      pushToast('T-SPIN!');
    }

    const esDificil = cleared === 4 || spin;
    if (backToBack && esDificil) {
      total *= BACK_TO_BACK_MULT;
      pushToast('BACK-TO-BACK!');
    }
    backToBack = esDificil ? true : (cleared > 0 ? false : backToBack);

    if (isEmptyBoard()) {
      total += PERFECT_CLEAR_BONUS * state.level;
      pushToast('PERFECT CLEAR!');
    }

    return Math.round(total);
  });

  // --- Marcador de combo en el panel ----------------------------------------
  const section = document.getElementById('combo-section');
  const comboEl = document.getElementById('combo');
  registerHudUpdater(() => {
    const activo = combo > 0;
    section.classList.toggle('hidden', !activo);
    if (activo) comboEl.textContent = `×${Math.min(1 + combo, COMBO_CAP)}`;
  });

  // --- Avisos flotantes sobre el tablero -------------------------------------
  registerPainter((ctx) => {
    if (!toasts.length) return;
    const now = performance.now();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.lineWidth = 3;
    let y = 70;
    for (let i = toasts.length - 1; i >= 0; i--) {
      const t = toasts[i];
      const age = now - t.start;
      if (age >= TOAST_DURATION) { toasts.splice(i, 1); continue; }
      const alpha = 1 - age / TOAST_DURATION;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(t.text, (COLS * BLOCK) / 2, y);
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(t.text, (COLS * BLOCK) / 2, y);
      y += 26;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });
}
