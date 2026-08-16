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
  // Piezas no estándar (mejora 02). Los tonos se eligieron en los huecos de
  // matiz que dejan los siete clásicos, para que se distingan en tema claro y
  // oscuro: magenta, verde azulado, índigo, lima y marrón.
  '#ec407a', // 8  Plus (+)
  '#009688', // 9  U
  '#5c6bc0', // 10 Y
  '#c0ca33', // 11 Punto (1×1)
  '#8d6e63', // 12 Cuadro hueco
  // Power-ups (mejora 01). 1×1, como el Punto — se distinguen solo por color
  // porque nunca conviven varias piezas especiales en pantalla a la vez.
  '#ff5722', // 13 Bomba
  '#fff176', // 14 Rayo
  '#ab47bc', // 15 Tinte
  '#795548', // 16 Gravedad
  '#4fc3f7', // 17 Congelar
  '#eceff1', // 18 Comodín (resultado del Tinte; nunca sale como pieza)
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
  // Piezas no estándar (mejora 02). No salen por azar uniforme: la bolsa la
  // decide src/features/piezas-nuevas.js con setPieceSelector().
  [[0,8,0],[8,8,8],[0,8,0]],                 // 8  Plus (+): simétrico, no cambia al rotar
  [[9,0,9],[9,9,9],[0,0,0]],                 // 9  U
  [[0,10],[10,10],[0,10],[0,10]],            // 10 Y: 4×2, gira a 2×4
  [[11]],                                    // 11 Punto (1×1)
  [[12,12,12],[12,0,12],[12,12,12]],         // 12 Cuadro hueco: simétrico
  // Power-ups (mejora 01). No salen por azar uniforme: los concede
  // src/features/powerups.js cada POWERUP_LINES líneas limpiadas.
  [[13]],                                    // 13 Bomba
  [[14]],                                    // 14 Rayo
  [[15]],                                    // 15 Tinte
  [[16]],                                    // 16 Gravedad
  [[17]],                                    // 17 Congelar
  [[18]],                                    // 18 Comodín: nunca se genera como pieza, solo como celda
];

// Número TOTAL de tipos de pieza, clásicos y especiales. Se deriva de PIECES:
// sirve para recorrer todos los tipos, no para sortear la bolsa.
export const PIECE_COUNT = PIECES.length - 1;

// Cuántas de esas piezas son los tetrominós clásicos (I..L, índices 1..7).
// La bolsa por defecto solo reparte estas: las piezas especiales las concede la
// mejora 02 con sus propias probabilidades.
export const STANDARD_PIECE_COUNT = 7;

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
