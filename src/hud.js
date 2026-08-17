'use strict';

import { state } from './state.js';

// Marcadores del panel lateral y overlay de PAUSA / GAME OVER.

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
export const restartBtn = document.getElementById('restart-btn');

// PUNTO DE EXTENSIÓN — marcadores nuevos (combo, energía, objetivo del desafío).
// Registra un actualizador en vez de editar updateHUD(); se llama en cada
// refresco del HUD con el estado actual.
const hudUpdaters = [];

export function registerHudUpdater(fn) {
  hudUpdaters.push(fn);
  return () => {
    const i = hudUpdaters.indexOf(fn);
    if (i >= 0) hudUpdaters.splice(i, 1);
  };
}

export function updateHUD() {
  scoreEl.textContent = state.score.toLocaleString();
  linesEl.textContent = state.lines;
  levelEl.textContent = state.level;
  for (const update of hudUpdaters) update(state);
}

export function showOverlay(title, subtitle = '') {
  overlayTitle.textContent = title;
  overlayScore.textContent = subtitle;
  overlay.classList.remove('hidden');
}

export function hideOverlay() {
  overlay.classList.add('hidden');
}
