'use strict';

import {
  LINE_SCORES, SOFT_DROP_POINTS, HARD_DROP_POINTS,
  BASE_DROP_INTERVAL, MIN_DROP_INTERVAL, DROP_INTERVAL_STEP, LINES_PER_LEVEL,
} from './config.js';
import { state } from './state.js';
import { EVENTS, emit } from './events.js';

// Puntuación, nivel y velocidad de caída.
//
// PUNTO DE EXTENSIÓN — multiplicadores (combos, T-spin, back-to-back...):
// registra un modificador con `addScoreModifier`. Cada modificador recibe los
// puntos calculados hasta ahora y el contexto de la jugada, y devuelve los
// puntos ya modificados. Se aplican en orden de registro.

const scoreModifiers = [];

export function addScoreModifier(fn) {
  scoreModifiers.push(fn);
  return () => {
    const i = scoreModifiers.indexOf(fn);
    if (i >= 0) scoreModifiers.splice(i, 1);
  };
}

export function levelFromLines(lines) {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}

export function intervalForLevel(level) {
  return Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL - (level - 1) * DROP_INTERVAL_STEP);
}

// Suma los puntos de una limpieza de líneas y recalcula nivel y velocidad.
// Devuelve los puntos concedidos.
export function addLineClearScore(cleared, context = {}) {
  let points = (LINE_SCORES[cleared] || 0) * state.level;
  for (const fn of scoreModifiers) points = fn(points, { cleared, ...context });

  state.lines += cleared;
  state.score += points;

  const newLevel = levelFromLines(state.lines);
  if (newLevel !== state.level) {
    state.level = newLevel;
    state.dropInterval = intervalForLevel(newLevel);
    emit(EVENTS.LEVEL_UP, { level: newLevel });
  }
  return points;
}

export function addSoftDropScore(rows = 1) {
  state.score += rows * SOFT_DROP_POINTS;
}

export function addHardDropScore(rows) {
  state.score += rows * HARD_DROP_POINTS;
}
