'use strict';

// Constantes de configuración del juego.
//
// PUNTO DE EXTENSIÓN — piezas nuevas:
// El valor de cada celda del tablero es a la vez el tipo de pieza y el índice
// dentro de COLORS y PIECES. Para añadir una pieza basta con añadir una entrada
// en el MISMO índice de las dos listas: el resto del motor (randomPiece,
// drawBlock, merge) la recoge sin más cambios.

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// Tamaño de celda de la vista previa NEXT y lado del lienzo en celdas.
export const NEXT_BLOCK = 30;
export const NEXT_CELLS = 4;

export const COLORS = [
  null,
  '#4dd0e1', // 1 I - cyan
  '#ffd54f', // 2 O - amarillo
  '#ba68c8', // 3 T - morado
  '#81c784', // 4 S - verde
  '#e57373', // 5 Z - rojo
  '#90caf9', // 6 J - azul pálido
  '#ffb74d', // 7 L - naranja
];

export const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                             // O
  [[0,3,0],[3,3,3],[0,0,0]],                 // T
  [[0,4,4],[4,4,0],[0,0,0]],                 // S
  [[5,5,0],[0,5,5],[0,0,0]],                 // Z
  [[6,0,0],[6,6,6],[0,0,0]],                 // J
  [[0,0,7],[7,7,7],[0,0,0]],                 // L
];

// Número de tipos de pieza disponibles. Se deriva de PIECES para que añadir
// una pieza no obligue a tocar randomPiece().
export const PIECE_COUNT = PIECES.length - 1;

// Puntos por 1, 2, 3 y 4 líneas, multiplicados por el nivel actual.
export const LINE_SCORES = [0, 100, 300, 500, 800];

export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

// Velocidad de caída: intervalo inicial y cómo se acelera con el nivel.
export const BASE_DROP_INTERVAL = 1000;
export const MIN_DROP_INTERVAL = 100;
export const DROP_INTERVAL_STEP = 90;
export const LINES_PER_LEVEL = 10;

export const THEME_KEY = 'tetris-theme';
