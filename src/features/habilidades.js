'use strict';

import { COLORS } from '../config.js';
import { state } from '../state.js';
import { collide } from '../board.js';
import { randomPiece, getPieceSelector, setPieceSelector } from '../pieces.js';
import { intervalForLevel } from '../scoring.js';
import { updateHUD, registerHudUpdater } from '../hud.js';
import { EVENTS, on } from '../events.js';
import { bindKey } from '../input.js';
import { hold } from './hold.js';

// Mejora 05 — Sistema de habilidades cargables (docs/upgrades/05-habilidades.md).
//
// Una barra de energía (0-100) que sube al limpiar líneas y se gasta activando
// una de cinco habilidades. Reservar pieza reutiliza la mecánica de la mejora
// 06 (src/features/hold.js) en vez de reimplementarla.

const ENERGY_PER_CLEAR = [0, 8, 20, 35, 55];
const MAX_ENERGY = 100;

const VER5_DURATION = 8000;    // ms que se muestra la cola de próximas piezas
const RALENTIZAR_DURATION = 10000; // ms que dura la ralentización
const FLASH_DURATION = 400;    // ms del parpadeo de "energía insuficiente"

let energia = 0;

// --- Ver 5 siguientes -------------------------------------------------------
// Cola propia de tipos ya decididos, para no tocar actions.js: el selector se
// ENVUELVE (como hace powerups sobre piezas-nuevas), nunca se sustituye del
// todo, así el resto de mejoras que ya decidan piezas siguen funcionando.
const cola = [];
let ver5Visible = false;
let ver5Elapsed = 0;

// Selector que había instalado antes cualquier otra mejora (power-ups sobre
// piezas-nuevas, o el por defecto). Se captura UNA vez al registrar: es lo que
// rellena la cola, para no leerse a sí misma a través del selector propio.
let previousSelector = null;

function instalarSelectorConCola() {
  previousSelector = getPieceSelector();
  setPieceSelector(() => (cola.length ? cola.shift() : previousSelector()));
}

function activarVer5() {
  while (cola.length < 5) cola.push(previousSelector());
  ver5Visible = true;
  ver5Elapsed = 0;
  return true;
}

// --- Cambiar pieza actual ---------------------------------------------------
function cambiarPieza() {
  const nueva = randomPiece();
  if (collide(nueva.shape, nueva.x, nueva.y)) return false;
  state.current = nueva;
  return true;
}

// --- Ralentizar --------------------------------------------------------------
let ralentizarActivo = false;
let ralentizarElapsed = 0;

function activarRalentizar() {
  if (!ralentizarActivo) state.dropInterval *= 2;
  ralentizarActivo = true;
  ralentizarElapsed = 0;
  return true;
}

// --- Deshacer ----------------------------------------------------------------
// Instantánea tomada en cada SPAWN: en ese momento el tablero refleja el
// resultado del último lockPiece (merge + clearLines ya ocurrieron), así que
// es exactamente el estado "previo al próximo lockPiece" — o dicho al revés,
// deshacer restaura el tablero de ANTES de la pieza que se acaba de fijar.
let snapshot = null;

function deshacer() {
  if (!snapshot) return false;
  state.board = snapshot.board.map(fila => [...fila]);
  state.score = snapshot.score;
  state.lines = snapshot.lines;
  state.level = snapshot.level;
  state.dropInterval = snapshot.dropInterval;
  snapshot = null; // un solo paso: no se puede deshacer dos veces seguidas
  return true;
}

// --- Activación --------------------------------------------------------------
const HABILIDADES = {
  ver5: { costo: 20, ejecutar: activarVer5 },
  cambiar: { costo: 30, ejecutar: cambiarPieza },
  ralentizar: { costo: 40, ejecutar: activarRalentizar },
  deshacer: { costo: 60, ejecutar: deshacer },
  hold: { costo: 10, ejecutar: hold },
};

function usar(id) {
  const h = HABILIDADES[id];
  if (energia < h.costo) {
    flashEnergyBar();
    return;
  }
  // Algunas habilidades pueden no surtir efecto (cambiar pieza que no cabe,
  // deshacer sin instantánea, hold ya usado): en ese caso no se gasta energía.
  if (h.ejecutar() === false) return;
  energia -= h.costo;
  updateHUD();
}

// --- UI ------------------------------------------------------------------
const energyFill = document.getElementById('energy-fill');
const previewSection = document.getElementById('preview-section');
const previewChips = document.getElementById('preview-chips');

function flashEnergyBar() {
  energyFill.classList.remove('flash');
  // Fuerza el reflow para poder reiniciar la animación si ya estaba corriendo.
  void energyFill.offsetWidth;
  energyFill.classList.add('flash');
  setTimeout(() => energyFill.classList.remove('flash'), FLASH_DURATION);
}

function renderPreview() {
  previewSection.classList.toggle('hidden', !ver5Visible);
  if (!ver5Visible) return;
  previewChips.innerHTML = '';
  for (const tipo of cola.slice(0, 5)) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = COLORS[tipo];
    previewChips.appendChild(chip);
  }
}

function reset() {
  energia = 0;
  cola.length = 0;
  ver5Visible = false;
  ver5Elapsed = 0;
  ralentizarActivo = false;
  ralentizarElapsed = 0;
  snapshot = null;
}

export function registerHabilidades() {
  instalarSelectorConCola();

  on(EVENTS.RESET, reset);

  on(EVENTS.LINES_CLEAR, ({ cleared }) => {
    energia = Math.min(MAX_ENERGY, energia + (ENERGY_PER_CLEAR[cleared] || 0));
    updateHUD();
  });

  // Si el nivel sube mientras "ralentizar" está activo, scoring.js ya
  // recalculó state.dropInterval = intervalForLevel(nuevoNivel) ANTES de
  // emitir este evento (ver addLineClearScore), borrando el ×2 sin querer.
  // Se vuelve a doblar aquí para que el efecto siga vivo con la velocidad
  // base del nivel nuevo.
  on(EVENTS.LEVEL_UP, () => {
    if (ralentizarActivo) state.dropInterval *= 2;
  });

  // Instantánea para "deshacer": el tablero justo antes de la pieza que entra.
  on(EVENTS.SPAWN, () => {
    snapshot = {
      board: state.board.map(fila => [...fila]),
      score: state.score,
      lines: state.lines,
      level: state.level,
      dropInterval: state.dropInterval,
    };
  });

  // Temporizadores por frame: cuentan con TICK, no con setTimeout, para que la
  // pausa los congele de verdad (el bucle deja de emitir TICK en pausa).
  on(EVENTS.TICK, ({ dt }) => {
    if (ver5Visible) {
      ver5Elapsed += dt;
      if (ver5Elapsed >= VER5_DURATION) {
        ver5Visible = false;
        updateHUD();
      }
    }
    if (ralentizarActivo) {
      ralentizarElapsed += dt;
      if (ralentizarElapsed >= RALENTIZAR_DURATION) {
        ralentizarActivo = false;
        // No se restaura el valor guardado: si el nivel subió durante el
        // efecto, la velocidad correcta es la del nivel ACTUAL.
        state.dropInterval = intervalForLevel(state.level);
      }
    }
  });

  bindKey('Digit1', () => usar('ver5'));
  bindKey('Digit2', () => usar('cambiar'));
  bindKey('Digit3', () => usar('ralentizar'));
  bindKey('Digit4', () => usar('deshacer'));
  bindKey('Digit5', () => usar('hold'));

  registerHudUpdater(() => {
    energyFill.style.width = `${energia}%`;
    renderPreview();
  });
}
