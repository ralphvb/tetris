'use strict';

import { COLS, ROWS, BLOCK, COLORS, NEXT_BLOCK, NEXT_CELLS } from './config.js';
import { state } from './state.js';
import { ghostY } from './pieces.js';

// Todo el dibujado en canvas. Este módulo no decide reglas: solo pinta `state`.

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

export { canvas, ctx, nextCanvas, nextCtx };

// Color de la rejilla; lo fija theme.js leyendo la variable CSS --grid-line.
let gridLineColor = '#22222e';

export function setGridLineColor(color) {
  gridLineColor = color;
}

// PUNTO DE EXTENSIÓN — capas de dibujado.
// Una mejora que necesite pintar algo encima del tablero (explosión de una
// bomba, marco de una celda congelada, texto de combo) registra un painter en
// vez de editar draw(). Se llama al final de cada frame con (ctx, state).
const painters = [];

export function registerPainter(fn) {
  painters.push(fn);
  return () => {
    const i = painters.indexOf(fn);
    if (i >= 0) painters.splice(i, 1);
  };
}

export function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = COLORS[colorIndex];
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // brillo superior
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

// Dibuja una forma (matriz) en el contexto indicado, con desplazamiento en celdas.
export function drawShape(context, shape, offX, offY, size, alpha) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = gridLineColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

// Repinta el tablero entero: rejilla → bloques fijados → fantasma → pieza actual.
export function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Puede pintarse antes de la primera partida (al aplicar el tema al cargar).
  if (!state.board.length) return;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, state.board[r][c], BLOCK);

  // tras el fin de partida no se pintan ni el fantasma ni la pieza actual
  if (!state.gameOver && state.current) {
    drawShape(ctx, state.current.shape, state.current.x, ghostY(), BLOCK, 0.2);
    drawShape(ctx, state.current.shape, state.current.x, state.current.y, BLOCK);
  }

  for (const paint of painters) paint(ctx, state);
}

// Vista previa de la siguiente pieza, centrada en un lienzo de NEXT_CELLS².
export function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!state.next) return;
  const shape = state.next.shape;
  const offX = Math.floor((NEXT_CELLS - shape[0].length) / 2);
  const offY = Math.floor((NEXT_CELLS - shape.length) / 2);
  drawShape(nextCtx, shape, offX, offY, NEXT_BLOCK);
}

// Dibuja una pieza centrada en cualquier canvas auxiliar (vista NEXT, panel de
// HOLD...). Lo usa la mejora de Hold para su propio lienzo.
export function drawPieceIn(context, targetCanvas, shape, size = NEXT_BLOCK, cells = NEXT_CELLS, alpha) {
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  if (!shape) return;
  const offX = Math.floor((cells - shape[0].length) / 2);
  const offY = Math.floor((cells - shape.length) / 2);
  drawShape(context, shape, offX, offY, size, alpha);
}
