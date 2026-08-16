'use strict';

import { THEME_KEY } from './config.js';
import { setGridLineColor } from './render.js';
import { EVENTS, emit } from './events.js';

// Tema claro/oscuro. La paleta vive en style.css (`:root` y `body.light-theme`);
// aquí solo se alterna la clase, se persiste la preferencia y se sincroniza el
// color de la rejilla del canvas, que CSS no puede pintar.

const themeToggle = document.getElementById('theme-toggle');

export function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  themeToggle.checked = theme === 'light';
  setGridLineColor(getComputedStyle(document.body).getPropertyValue('--grid-line').trim());
  emit(EVENTS.THEME_CHANGE, { theme });
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');

  themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'light' : 'dark';
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  });
}
