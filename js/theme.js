// Application theme preference and document-level application.
import { state } from './state.js';

const STORAGE_KEY = 'vfx-sheet-theme';

function isTheme(value) {
  return value === 'dark' || value === 'light';
}

export function applyTheme(theme) {
  const resolvedTheme = isTheme(theme) ? theme : 'dark';
  state.currentTheme = resolvedTheme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'light' ? '#f8fafc' : '#090d16');

  document.querySelectorAll('[data-action="set-theme"]').forEach(button => {
    const selected = button.dataset.theme === resolvedTheme;
    button.setAttribute('aria-pressed', String(selected));
  });
}

export function initTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read theme preference.', error);
  }
  applyTheme(savedTheme);
}

export function toggleTheme() {
  setTheme(state.currentTheme === 'light' ? 'dark' : 'light');
}

export function setTheme(theme) {
  const nextTheme = isTheme(theme) ? theme : 'dark';
  try {
    localStorage.setItem(STORAGE_KEY, nextTheme);
  } catch (error) {
    console.warn('Unable to save theme preference.', error);
  }
  applyTheme(nextTheme);
}
