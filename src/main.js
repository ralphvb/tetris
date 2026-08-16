'use strict';

import { state, resetState } from './state.js';
import { collide } from './board.js';
import { randomPiece } from './pieces.js';
import { lockPiece, spawn } from './actions.js';
import { draw, drawNext } from './render.js';
import { updateHUD, showOverlay, hideOverlay, restartBtn } from './hud.js';
import { initInput } from './input.js';
import { initTheme } from './theme.js';
import { EVENTS, on, emit } from './events.js';
import { registerFeatures } from './features/index.js';

// Punto de entrada: bucle de juego, arranque y cableado entre módulos.
//
// Si tu mejora necesita reaccionar a algo del ciclo de vida, suscríbete desde
// src/features/<tu-mejora>.js. Este archivo no debería crecer con cada rama.

function loop(ts) {
  const dt = ts - state.lastTime;
  state.lastTime = ts;
  state.dropAccum += dt;

  // Gancho por frame: temporizadores de las mejoras (congelar, ralentizar,
  // animaciones) deben contar el tiempo aquí y no con setTimeout, para que la
  // pausa los detenga de verdad.
  emit(EVENTS.TICK, { dt });

  if (state.dropAccum >= state.dropInterval) {
    state.dropAccum = 0;
    if (!collide(state.current.shape, state.current.x, state.current.y + 1)) {
      state.current.y++;
    } else {
      lockPiece();
    }
  }

  // endGame() ya pintó el estado final; no reprogramar el bucle.
  if (state.gameOver) return;

  draw();
  state.animId = requestAnimationFrame(loop);
}

function startLoop() {
  state.lastTime = performance.now();
  cancelAnimationFrame(state.animId);
  state.animId = requestAnimationFrame(loop);
}

function stopLoop() {
  cancelAnimationFrame(state.animId);
}

// --- Cableado ---------------------------------------------------------------

on(EVENTS.SPAWN, drawNext);

on(EVENTS.GAME_OVER, () => {
  stopLoop();
  draw(); // pinta el estado final: el bucle ya no volverá a dibujar
  showOverlay('GAME OVER', `Puntuación: ${state.score.toLocaleString()}`);
});

on(EVENTS.PAUSE, () => {
  stopLoop();
  showOverlay('PAUSA');
});

on(EVENTS.RESUME, () => {
  hideOverlay();
  startLoop();
});

// El tema cambia el color de la rejilla: hay que repintar aunque estemos en
// pausa o en game over, cuando el bucle no está corriendo.
on(EVENTS.THEME_CHANGE, () => {
  draw();
  drawNext();
});

restartBtn.addEventListener('click', init);

// --- Arranque ---------------------------------------------------------------

export function init() {
  stopLoop();
  resetState();
  // Aviso a las mejoras para que limpien su propio estado (energía, combo,
  // pieza en hold, objetivos del desafío...). Se emite ANTES de generar la
  // primera pieza para que nadie vea datos de la partida anterior.
  emit(EVENTS.RESET, {});
  hideOverlay();

  state.next = randomPiece();
  spawn();
  updateHUD();
  startLoop();
}

initTheme();
initInput();
registerFeatures();
init();
