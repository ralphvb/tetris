'use strict';

import { state } from '../state.js';
import { setPieceSelector, defaultPieceSelector } from '../pieces.js';
import { EVENTS, on } from '../events.js';

// Mejora 02 — Piezas nuevas no estándar (docs/upgrades/02-piezas-nuevas.md).
//
// Las formas y los colores viven en config.js (índices 8..12); aquí solo se
// decide CUÁNDO sale cada una, sustituyendo el selector de la bolsa. El motor
// no cambia: randomPiece() sigue llamando al selector y drawBlock()/merge()
// tratan las piezas nuevas como cualquier otra.

// Índices dentro de PIECES/COLORS.
const PLUS = 8;
const U = 9;
const Y = 10;
const DOT = 11;
const RING = 12;

// Pentominós que entran por azar, con su peso relativo dentro del grupo.
// El Plus es el más difícil de encajar, así que es el más raro de los tres.
const PENTOMINOES = [
  { type: U, weight: 0.4 },
  { type: Y, weight: 0.4 },
  { type: PLUS, weight: 0.2 },
];

// Probabilidad combinada de los pentominós: baja al empezar y sube despacio con
// el nivel, con tope para que la mayoría de piezas sigan siendo las clásicas.
const PENTOMINO_BASE_CHANCE = 0.06;
const PENTOMINO_LEVEL_STEP = 0.005;
const PENTOMINO_MAX_CHANCE = 0.12;

// El cuadro hueco es un castigo de niveles altos: deja un agujero irrellenable.
const RING_MIN_LEVEL = 5;
const RING_CHANCE = 0.03;

// El 1×1 no sale por azar: se concede tras un Tetris (4 líneas de golpe).
const DOT_REWARD_LINES = 4;
let dotPending = false;

function pentominoChance() {
  return Math.min(
    PENTOMINO_MAX_CHANCE,
    PENTOMINO_BASE_CHANCE + (state.level - 1) * PENTOMINO_LEVEL_STEP,
  );
}

function pickPentomino() {
  let r = Math.random();
  for (const { type, weight } of PENTOMINOES) {
    if (r < weight) return type;
    r -= weight;
  }
  return PENTOMINOES[PENTOMINOES.length - 1].type;
}

// Orden de prioridad: recompensa → castigo de nivel alto → pentominó → clásica.
function selectPiece() {
  if (dotPending) {
    dotPending = false;
    return DOT;
  }
  if (state.level >= RING_MIN_LEVEL && Math.random() < RING_CHANCE) return RING;
  if (Math.random() < pentominoChance()) return pickPentomino();
  return defaultPieceSelector();
}

export function registerPiezasNuevas() {
  setPieceSelector(selectPiece);

  on(EVENTS.LINES_CLEAR, ({ cleared }) => {
    if (cleared >= DOT_REWARD_LINES) dotPending = true;
  });

  // El pendiente es estado propio de la mejora: si no se limpia, un Tetris de
  // la partida anterior regalaría el 1×1 en la siguiente.
  on(EVENTS.RESET, () => { dotPending = false; });
}
