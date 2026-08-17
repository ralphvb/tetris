'use strict';

import { COLS, PIECES, STANDARD_PIECE_COUNT } from './config.js';
import { collide } from './board.js';
import { state } from './state.js';

// Creación y rotación de piezas.

// Desplazamientos que se prueban cuando una rotación choca (wall kicks
// simples, no SRS). Es un array exportado y mutable: una mejora puede sustituir
// la tabla con `KICKS.splice(0, KICKS.length, ...nuevos)`.
export const KICKS = [0, -1, 1, -2, 2];

// PUNTO DE EXTENSIÓN — de qué bolsa salen las piezas.
// Por defecto, uniforme entre los tipos de PIECES. La mejora de piezas nuevas
// (pentominós, 1×1 de recompensa...) sustituye este selector en vez de tocar
// randomPiece():
//
//     setPieceSelector(() => raro() ? PENTOMINO : defaultPieceSelector());
let pieceSelector = defaultPieceSelector;

// Bolsa por defecto: uniforme entre los SIETE tetrominós clásicos. No usa
// PIECE_COUNT a propósito — desde la mejora 02 hay piezas especiales en PIECES
// que solo deben salir cuando su selector las concede.
export function defaultPieceSelector() {
  return Math.floor(Math.random() * STANDARD_PIECE_COUNT) + 1;
}

export function setPieceSelector(fn) {
  pieceSelector = fn ?? defaultPieceSelector;
}

// Devuelve el selector activo. Existe para que una mejora pueda ENVOLVER al
// selector de otra en vez de reemplazarlo (p. ej. power-ups sobre piezas
// nuevas): guarda el selector anterior antes de instalar el suyo con
// setPieceSelector() y le cede el turno cuando no tiene nada propio que dar.
export function getPieceSelector() {
  return pieceSelector;
}

// Construye una pieza del tipo indicado (o del que decida el selector),
// centrada en la parte superior del tablero.
export function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function randomPiece() {
  return makePiece(pieceSelector());
}

// Rotación por transposición + inversión de filas.
export function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export function rotateCCW(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

// Intenta rotar la pieza aplicando la lista de kicks. Devuelve true si giró.
export function tryRotate(piece = state.current, rotate = rotateCW) {
  const rotated = rotate(piece.shape);
  for (const kick of KICKS) {
    if (!collide(rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return true;
    }
  }
  return false;
}

// Fila en la que aterrizaría la pieza si cayera ya (pieza fantasma).
export function ghostY(piece = state.current) {
  let gy = piece.y;
  while (!collide(piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
