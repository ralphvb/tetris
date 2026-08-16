'use strict';

import { state } from './state.js';
import { updateHUD } from './hud.js';
import { moveLeft, moveRight, rotate, softDrop, hardDrop, togglePause } from './actions.js';

// Teclado. Las teclas son una tabla, no un `switch`.
//
// PUNTO DE EXTENSIÓN — teclas nuevas (Hold con C/Shift, habilidades con 1-5):
//
//     import { bindKey } from '../input.js';
//     bindKey('KeyC', hold);
//
// Opciones por binding:
//   allowWhenPaused → la tecla responde también en pausa o game over (como P)
//   preventDefault  → evita el scroll del navegador; viene activado por defecto,
//                      así que es opt-out: pásalo en `false` solo si de verdad
//                      quieres que la tecla deje pasar el comportamiento nativo.

const bindings = new Map();

export function bindKey(code, handler, { allowWhenPaused = false, preventDefault = true } = {}) {
  bindings.set(code, { handler, allowWhenPaused, preventDefault });
  return () => bindings.delete(code);
}

export function unbindKey(code) {
  bindings.delete(code);
}

function onKeyDown(e) {
  const t = e.target;
  if (t && (t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const binding = bindings.get(e.code);
  if (!binding) return;
  if (binding.preventDefault) e.preventDefault();
  if (!binding.allowWhenPaused && (state.paused || state.gameOver)) return;
  binding.handler(e);
  updateHUD();
}

// Teclas por defecto. No borres ninguna al añadir las tuyas.
export function initInput() {
  bindKey('KeyP', togglePause, { allowWhenPaused: true });
  bindKey('ArrowLeft', moveLeft);
  bindKey('ArrowRight', moveRight);
  bindKey('ArrowDown', softDrop);
  bindKey('ArrowUp', rotate);
  bindKey('KeyX', rotate);
  bindKey('Space', hardDrop, { preventDefault: true });

  document.addEventListener('keydown', onKeyDown);
}
