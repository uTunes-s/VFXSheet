// Form page navigation and HDRI-weather controls.
import { renderList } from './record-list-renderer.js';

export function switchAppPage(page) {
  const isRecordPage = page === 'record';
  document.getElementById('recordPage').classList.toggle('hidden', !isRecordPage);
  document.getElementById('historyPage').classList.toggle('hidden', isRecordPage);

  const recordButton = document.getElementById('recordNavBtn');
  const historyButton = document.getElementById('historyNavBtn');
  if (recordButton) {
    recordButton.className = `flex flex-col items-center rounded-lg py-1 text-xs font-bold ${isRecordPage ? 'text-amber-400' : 'text-slate-400 hover:text-slate-100'}`;
    recordButton.toggleAttribute('aria-current', isRecordPage);
  }
  historyButton.className = `flex flex-col items-center rounded-lg py-1 text-xs font-bold ${isRecordPage ? 'text-slate-400 hover:text-slate-100' : 'text-amber-400'}`;
  historyButton.toggleAttribute('aria-current', !isRecordPage);

  if (!isRecordPage) renderList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function toggleHdriWeather(isCaptured) {
  document.getElementById('weatherContainer').classList.toggle('hidden', !isCaptured);
}

export function getWeatherValues() {
  return [...document.getElementById('hdri_weather').selectedOptions].map(option => option.value);
}

export function setWeatherValues(values) {
  const selected = new Set(Array.isArray(values) ? values : String(values || '').split(', ').filter(Boolean));
  [...document.getElementById('hdri_weather').options].forEach(option => {
    option.selected = selected.has(option.value);
  });
}

