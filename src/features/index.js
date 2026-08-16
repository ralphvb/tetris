'use strict';

// Registro de mejoras.
//
// ESTE ES EL ÚNICO ARCHIVO COMPARTIDO QUE TOCA CADA SUBRAMA.
// Cada mejora del roadmap (docs/upgrades/) vive en su propio módulo dentro de
// esta carpeta y exporta una función `register()` que se engancha al juego
// usando los puntos de extensión: `on(EVENTS.…)`, `bindKey(…)`,
// `registerPainter(…)`, `registerHudUpdater(…)`, `addScoreModifier(…)`.
//
// Para activar una mejora se añaden DOS líneas: el import y la entrada del
// array. Así el conflicto de merge entre subramas, si lo hay, es de una línea.
//
// Ejemplo (rama upgrade/06-hold):
//     import { registerHold } from './hold.js';
//     const features = [registerHold];

import { registerHold } from './hold.js';
import { registerPiezasNuevas } from './piezas-nuevas.js';
import { registerCombos } from './combos.js';
import { registerPowerups } from './powerups.js';

const features = [
  registerHold,
  // Power-ups envuelve el selector de piezas activo en vez de sustituirlo, así
  // que debe registrarse DESPUÉS de piezas-nuevas para no perder pentominós,
  // Punto ni Cuadro hueco.
  registerPiezasNuevas,
  registerPowerups,
  registerCombos,
  // ← añade aquí tu register…
];

export function registerFeatures() {
  for (const register of features) register();
}
