'use strict';

import { state } from '../state.js';
import { collide } from '../board.js';
import { makePiece } from '../pieces.js';
import { spawn, endGame } from '../actions.js';
import { drawPieceIn } from '../render.js';
import { bindKey } from '../input.js';
import { registerHudUpdater } from '../hud.js';
import { EVENTS, on } from '../events.js';

// Mejora 06 — Sistema de Hold (docs/upgrades/06-hold.md).
//
// Guardar la pieza actual en una reserva para usarla más tarde. Todo vive aquí:
// el motor no sabe que esta mejora existe, solo la expone a través de sus
// puntos de extensión.

const section = document.getElementById('hold-section');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');

// Reserva la pieza en juego, o la intercambia con la ya reservada.
//
// Exportada porque la mejora 05 (habilidades) la reutiliza: allí reservar
// cuesta energía, pero la mecánica es exactamente esta.
export function hold() {
  // input.js ya filtra las teclas en pausa y tras el game over; la comprobación
  // se repite porque la 05 llamará a esta función directamente.
  if (state.holdUsed || state.paused || state.gameOver || !state.current) return false;

  const guardada = state.hold;
  // La pieza se guarda recreada desde cero: vuelve a su orientación y posición
  // de salida. Guardarla tal cual la sacaría rotada e incrustada en el tablero.
  state.hold = makePiece(state.current.type);
  state.holdUsed = true;

  if (guardada) {
    // Mismo orden que spawn(): se asigna y luego se comprueba, para que draw()
    // no llegue a pintar una pieza a medio colocar.
    state.current = guardada;
    if (collide(state.current.shape, state.current.x, state.current.y)) {
      endGame();
      return true;
    }
  } else {
    // Reserva vacía: no hay nada que devolver, entra la siguiente pieza.
    // spawn() ya termina la partida por su cuenta si esa pieza no cabe.
    spawn();
  }

  return true;
}

// Repinta el panel: la pieza reservada y el atenuado de "no disponible".
function renderHold() {
  drawPieceIn(holdCtx, holdCanvas, state.hold?.shape);
  section.classList.toggle('blocked', state.holdUsed && !state.gameOver);
}

export function registerHold() {
  bindKey('KeyC', hold);
  // Alias cómodo para quien juega con la mano izquierda en las flechas.
  bindKey('ShiftLeft', hold);
  bindKey('ShiftRight', hold);

  // La pieza se fijó: vuelve a haber reserva disponible.
  on(EVENTS.LOCK, () => { state.holdUsed = false; });

  // resetState() ya vacía hold/holdUsed; aquí solo hace falta repintar, porque
  // RESET se emite antes de la primera pieza de la partida nueva.
  on(EVENTS.RESET, renderHold);

  // El canvas no se repinta solo al cambiar de tema (el bucle puede estar
  // parado en pausa o game over).
  on(EVENTS.THEME_CHANGE, renderHold);

  // Vía única de repintado durante la partida: updateHUD() se llama tras cada
  // tecla (input.js), al fijar una pieza (lockPiece) y al arrancar (init).
  registerHudUpdater(renderHold);
}
