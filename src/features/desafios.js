'use strict';

import { COLS, ROWS, BLOCK } from '../config.js';
import { state } from '../state.js';
import { collide } from '../board.js';
import { endGame } from '../actions.js';
import { EVENTS, on } from '../events.js';
import { restartBtn, registerHudUpdater } from '../hud.js';
import { registerPainter } from '../render.js';

// Mejora 04 — Modo desafío con objetivos (docs/upgrades/04-desafios.md).
//
// La más transversal del roadmap: no añade jugabilidad propia, reutiliza la
// que ya existe (piezas nuevas, power-ups, combos, rotación) y la envuelve en
// objetivos con victoria/derrota. Por eso va la última.
//
// Cada desafío es un objeto de datos, no una rama de `if`; el runner (los
// `on(EVENTS...)` de más abajo) es el mismo para los cinco. El modo `clasico`
// no tiene entrada en CHALLENGES: el juego se comporta exactamente como sin
// esta mejora.

const GARBAGE = 19; // índice de celda de "basura" (config.js); nunca es una pieza jugable

const SPRINT_TARGET_LINES = 40;
const SPRINT_TIME_MS = 120000;

const GARBAGE_INTERVAL_MS = 10000;

const SEMBRADO_TARGET_LINES = 15;
const SEMBRADO_ROWS = 6; // filas sembradas al empezar, desde el fondo

const INVISIBLE_TARGET_LINES = 20;

const ROTATION_TARGET_LEVEL = 5;
const ROTATION_INVERT_FROM_LEVEL = 3; // a partir de este nivel gira al revés

let mode = 'clasico';
let remaining = 0;     // ms restantes (Sprint)
let garbageAccum = 0;  // ms acumulados hacia la próxima fila de basura
let result = null;     // { won, detail } pendiente de mostrar en GAME_OVER
let boardBg = '#1a1a25'; // fondo del tablero; tapa las piezas fijadas en el desafío "invisibles"

const modeSelect = document.getElementById('mode-select');
const section = document.getElementById('challenge-section');
const statusEl = document.getElementById('challenge-status');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function randomSeedType() {
  return 1 + Math.floor(Math.random() * 7); // uno de los 7 tetrominós clásicos
}

// Termina la partida con un resultado propio. endGame() ya para el bucle y
// emite GAME_OVER; el handler de más abajo (registrado después del de
// main.js) sustituye el texto por defecto con `result`.
function finish(won, detail) {
  if (state.gameOver) return;
  result = { won, detail };
  endGame();
}

// --- Basura: sube una fila desde abajo cada GARBAGE_INTERVAL_MS -----------
function addGarbageRow() {
  state.board.shift();
  const gap = Math.floor(Math.random() * COLS);
  const row = new Array(COLS).fill(GARBAGE);
  row[gap] = 0;
  state.board.push(row);

  if (!state.current) return;
  // La pila subió una fila: si la pieza en juego quedó incrustada, se sube
  // hasta que deje de solapar. No hace perder la partida por sí sola: si de
  // verdad no cabe en ningún sitio, el próximo spawn() lo detecta como
  // top-out normal.
  let tries = 0;
  while (collide(state.current.shape, state.current.x, state.current.y) && tries < ROWS * 2) {
    state.current.y--;
    tries++;
  }
}

// --- Tablero sembrado: bloques ya colocados antes de la primera pieza -----
function seedBoard() {
  const startRow = ROWS - SEMBRADO_ROWS;
  for (let r = startRow; r < ROWS; r++) {
    const gap = Math.floor(Math.random() * COLS);
    for (let c = 0; c < COLS; c++) {
      state.board[r][c] = c === gap ? 0 : randomSeedType();
    }
  }
}

// --- Los cinco desafíos, como datos ----------------------------------------

const CHALLENGES = {
  sprint: {
    setup() { remaining = SPRINT_TIME_MS; },
    tick(dt) {
      remaining -= dt;
      if (remaining <= 0) finish(false, 'Se acabó el tiempo');
    },
    onLinesClear() {
      if (state.lines >= SPRINT_TARGET_LINES) finish(true, formatTime(SPRINT_TIME_MS - remaining));
    },
    hud() { return `${state.lines}/${SPRINT_TARGET_LINES} · ${formatTime(remaining)}`; },
  },
  basura: {
    setup() { garbageAccum = 0; },
    tick(dt) {
      garbageAccum += dt;
      if (garbageAccum >= GARBAGE_INTERVAL_MS) {
        garbageAccum -= GARBAGE_INTERVAL_MS;
        addGarbageRow();
      }
    },
    hud() { return `Sobrevive · basura en ${formatTime(GARBAGE_INTERVAL_MS - garbageAccum)}`; },
  },
  sembrado: {
    setup() { seedBoard(); },
    onLinesClear() {
      if (state.lines >= SEMBRADO_TARGET_LINES) finish(true, `${state.lines} líneas`);
    },
    hud() { return `${state.lines}/${SEMBRADO_TARGET_LINES} líneas`; },
  },
  invisibles: {
    onLinesClear() {
      if (state.lines >= INVISIBLE_TARGET_LINES) finish(true, `${state.lines} líneas`);
    },
    hud() { return `${state.lines}/${INVISIBLE_TARGET_LINES} líneas (ocultas)`; },
  },
  rotacion: {
    onLevelUp(level) {
      state.rotationInverted = level >= ROTATION_INVERT_FROM_LEVEL;
      if (level >= ROTATION_TARGET_LEVEL) finish(true, `Nivel ${level}`);
    },
    hud() {
      const invertido = state.rotationInverted ? ' · rotación invertida' : '';
      return `Nivel ${state.level}/${ROTATION_TARGET_LEVEL}${invertido}`;
    },
  },
};

function reset() {
  remaining = 0;
  garbageAccum = 0;
  result = null;
  state.rotationInverted = false;
  CHALLENGES[mode]?.setup?.();
}

export function registerDesafios() {
  boardBg = getComputedStyle(document.body).getPropertyValue('--board-bg').trim();

  // setup() corre justo después de resetState() (RESET se emite antes de la
  // primera pieza), así que sembrar el tablero aquí es seguro.
  on(EVENTS.RESET, reset);
  on(EVENTS.TICK, ({ dt }) => CHALLENGES[mode]?.tick?.(dt));
  on(EVENTS.LINES_CLEAR, () => CHALLENGES[mode]?.onLinesClear?.());
  on(EVENTS.LEVEL_UP, ({ level }) => CHALLENGES[mode]?.onLevelUp?.(level));

  // Se registra DESPUÉS del handler de GAME_OVER de main.js (que ya mostró el
  // overlay con el texto por defecto): este handler lo sustituye cuando hay
  // un desafío activo. En modo clásico no toca nada.
  on(EVENTS.GAME_OVER, () => {
    const won = mode !== 'clasico' && result?.won === true;
    overlayTitle.classList.toggle('victory', won);
    if (mode === 'clasico') return;

    overlayTitle.textContent = won ? '¡VICTORIA!' : 'DESAFÍO FALLIDO';
    overlayScore.textContent = result
      ? `${result.detail} · Puntuación: ${state.score.toLocaleString()}`
      : `Puntuación: ${state.score.toLocaleString()}`;
  });

  on(EVENTS.THEME_CHANGE, () => {
    boardBg = getComputedStyle(document.body).getPropertyValue('--board-bg').trim();
  });

  // Cambiar de modo reinicia la partida de inmediato: el desafío nuevo no
  // debe arrastrar estado del anterior (lo limpia reset(), vía RESET).
  modeSelect.addEventListener('change', () => {
    mode = modeSelect.value;
    restartBtn.click();
  });

  // --- Piezas invisibles: tapa los bloques ya fijados, no el fantasma/pieza --
  registerPainter((ctx) => {
    if (mode !== 'invisibles' || !state.board.length) return;
    ctx.save();
    ctx.fillStyle = boardBg;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (state.board[r][c]) ctx.fillRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
    ctx.restore();
  });

  // --- Objetivo/progreso en el panel -----------------------------------------
  registerHudUpdater(() => {
    const active = mode !== 'clasico';
    section.classList.toggle('hidden', !active);
    if (active) statusEl.textContent = CHALLENGES[mode]?.hud?.() ?? '';
  });
}
