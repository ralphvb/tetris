'use strict';

import { COLS, ROWS, BLOCK } from '../config.js';
import { state } from '../state.js';
import { EVENTS, on } from '../events.js';
import { setPieceSelector, getPieceSelector } from '../pieces.js';
import { clearCell } from '../board.js';
import { registerPainter } from '../render.js';

// Mejora 01 — Power-ups aleatorios (docs/upgrades/01-powerups.md).
//
// Cada power-up es un tipo de pieza propio (índices 13..17 en config.js),
// de 1×1 como el Punto de la mejora 02, que dispara un efecto sobre el
// tablero al fijarse. Se concede uno cada POWERUP_LINES líneas limpiadas,
// nunca dos veces seguidas el mismo tipo.
//
// El selector de piezas ya lo usa la mejora 02 (pentominós, Punto, Cuadro
// hueco): en vez de sustituirlo, envolvemos el que esté activo cuando este
// módulo se registra — por eso en features/index.js esta mejora se activa
// DESPUÉS de registerPiezasNuevas.

const BOMB = 13;
const LIGHTNING = 14;
const TINT = 15;
const GRAVITY = 16;
const FREEZE = 17;
const WILDCARD = 18; // celda «comodín» que deja el Tinte; nunca es una pieza

const POWERUP_TYPES = [BOMB, LIGHTNING, TINT, GRAVITY, FREEZE];
const POWERUP_LINES = 10;     // líneas limpiadas entre power-up y power-up
const FREEZE_DURATION = 5000; // ms reales de congelado
const POWERUP_BONUS = 150;    // puntos fijos al disparar un efecto, ×nivel
const FLASH_DURATION = 500;   // ms que dura la animación de disparo

const NAMES = {
  [BOMB]: 'BOMBA',
  [LIGHTNING]: 'RAYO',
  [TINT]: 'TINTE',
  [GRAVITY]: 'GRAVEDAD',
  [FREEZE]: 'CONGELAR',
};

let linesSinceLast = 0;  // líneas limpiadas desde el último power-up concedido
let pendingType = null;  // tipo ya decidido, esperando a ser la próxima pieza
let lastGranted = null;  // último tipo concedido, para no repetirlo
let freezeRemaining = 0; // ms de congelado que quedan (0 = no congelado)

const flashes = []; // { type, x, y, start } — feedback visual al disparar

function reset() {
  linesSinceLast = 0;
  pendingType = null;
  lastGranted = null;
  freezeRemaining = 0;
  flashes.length = 0;
}

// Elige un tipo al azar entre los cinco, evitando repetir el último concedido.
function pickType() {
  let type;
  do {
    type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  } while (type === lastGranted);
  return type;
}

function grantBonus() {
  state.score += POWERUP_BONUS * state.level;
}

// --- Los cinco efectos, todos mutando state.board directamente -------------

function effectBomb(piece) {
  for (let r = -1; r <= 1; r++)
    for (let c = -1; c <= 1; c++)
      clearCell(piece.y + r, piece.x + c);
}

function effectLightning(piece) {
  for (let c = 0; c < COLS; c++) clearCell(piece.y, c);
  for (let r = 0; r < ROWS; r++) clearCell(r, piece.x);
}

// Convierte todos los bloques de un color elegido al azar (entre los que
// haya en el tablero) en comodines. Un comodín cuenta como celda llena para
// clearLines() igual que cualquier otra, así que no hace falta tocar board.js.
function effectTint(piece) {
  const candidates = new Set();
  for (const row of state.board)
    for (const v of row)
      if (v && v !== TINT && v !== WILDCARD) candidates.add(v);

  if (candidates.size) {
    const list = [...candidates];
    const target = list[Math.floor(Math.random() * list.length)];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (state.board[r][c] === target) state.board[r][c] = WILDCARD;
  }
  // La propia celda del Tinte también se vuelve comodín.
  state.board[piece.y][piece.x] = WILDCARD;
}

// Compacta cada columna por separado: los bloques caen hasta llenar los
// huecos, sin perder ni duplicar ninguno.
function effectGravity() {
  for (let c = 0; c < COLS; c++) {
    const values = [];
    for (let r = 0; r < ROWS; r++)
      if (state.board[r][c]) values.push(state.board[r][c]);

    let r = ROWS - 1;
    for (let i = values.length - 1; i >= 0; i--) state.board[r--][c] = values[i];
    for (; r >= 0; r--) state.board[r][c] = 0;
  }
}

// No toca el bucle: se limita a marcar cuánto queda. El propio módulo cuenta
// el tiempo en EVENTS.TICK, que solo se emite mientras el bucle corre — así
// la pausa lo detiene gratis, sin lógica adicional.
function effectFreeze() {
  freezeRemaining = FREEZE_DURATION;
}

const EFFECTS = {
  [BOMB]: effectBomb,
  [LIGHTNING]: effectLightning,
  [TINT]: effectTint,
  [GRAVITY]: effectGravity,
  [FREEZE]: effectFreeze,
};

export function registerPowerups() {
  const previousSelector = getPieceSelector();

  setPieceSelector(() => {
    if (pendingType !== null) {
      const type = pendingType;
      pendingType = null;
      lastGranted = type;
      return type;
    }
    return previousSelector();
  });

  on(EVENTS.RESET, reset);

  on(EVENTS.LINES_CLEAR, ({ cleared }) => {
    linesSinceLast += cleared;
    if (pendingType === null && linesSinceLast >= POWERUP_LINES) {
      linesSinceLast -= POWERUP_LINES;
      pendingType = pickType();
    }
  });

  // LOCK se emite después de merge() y antes de clearLines(): el efecto
  // modifica el tablero y la limpieza posterior ya ve el resultado.
  on(EVENTS.LOCK, ({ piece }) => {
    const effect = EFFECTS[piece.type];
    if (!effect) return;
    effect(piece);
    grantBonus();
    flashes.push({ type: piece.type, x: piece.x, y: piece.y, start: performance.now() });
  });

  on(EVENTS.TICK, ({ dt }) => {
    if (freezeRemaining <= 0) return;
    state.dropAccum = 0; // la caída automática no avanza mientras está congelado
    freezeRemaining -= dt;
  });

  registerPainter((ctx) => {
    const now = performance.now();

    if (freezeRemaining > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.85)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, COLS * BLOCK - 4, ROWS * BLOCK - 4);
      ctx.restore();
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const age = now - f.start;
      if (age >= FLASH_DURATION) { flashes.splice(i, 1); continue; }
      const progress = age / FLASH_DURATION;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      if (f.type === BOMB) {
        ctx.beginPath();
        ctx.arc((f.x + 0.5) * BLOCK, (f.y + 0.5) * BLOCK, BLOCK * (0.5 + 1.5 * progress), 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === LIGHTNING) {
        ctx.fillRect(0, f.y * BLOCK, COLS * BLOCK, BLOCK);
        ctx.fillRect(f.x * BLOCK, 0, BLOCK, ROWS * BLOCK);
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(NAMES[f.type], (COLS * BLOCK) / 2, 40);
      ctx.fillStyle = '#eceff1';
      ctx.fillText(NAMES[f.type], (COLS * BLOCK) / 2, 40);
      ctx.restore();
    }
  });
}
