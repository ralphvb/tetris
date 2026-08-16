'use strict';

import { COLS, ROWS } from './config.js';
import { state } from './state.js';

// Operaciones sobre la matriz del tablero. Nada de aquí dibuja ni puntúa.

// ¿La forma `shape` colocada en (ox, oy) choca con los bordes o con un bloque
// ya fijado? Las filas por encima del tablero (ny < 0) no colisionan.
export function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && state.board[ny][nx]) return true;
    }
  }
  return false;
}

// Vuelca la pieza en el tablero.
export function merge(piece = state.current) {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        state.board[piece.y + r][piece.x + c] = piece.shape[r][c];
}

// Elimina las filas completas y devuelve cuántas y sus índices ORIGINALES (los
// que tenían antes de empezar a limpiar), útiles para animaciones. No puntúa:
// de eso se encarga scoring.js.
export function clearLines() {
  const rows = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r].every(v => v !== 0)) {
      state.board.splice(r, 1);
      state.board.unshift(new Array(COLS).fill(0));
      // Cada limpieza previa empujó esta fila una posición hacia abajo, así que
      // el índice original es r menos las filas ya eliminadas.
      rows.push(r - rows.length);
      r++;
    }
  }
  return { cleared: rows.length, rows };
}

// Utilidades que varias mejoras del roadmap necesitan (power-ups, gravedad,
// Perfect Clear). Viven aquí para no duplicarse en cada rama.

export function isEmptyBoard() {
  return state.board.every(row => row.every(v => v === 0));
}

export function clearCell(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  state.board[r][c] = 0;
}
