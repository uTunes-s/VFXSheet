// Application-shell concerns are deliberately isolated from feature modules.
// This file owns connectivity feedback and Service Worker registration.
import { APP_CONFIG } from './config.js';

function updateOnlineStatus() {
  const { onlineStatus } = APP_CONFIG;
  const dot = document.getElementById(onlineStatus.dotId);
  const text = document.getElementById(onlineStatus.textId);
  if (!dot || !text) return;

  if (navigator.onLine) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
    text.textContent = onlineStatus.onlineLabel;
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    text.textContent = onlineStatus.offlineLabel;
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(APP_CONFIG.serviceWorkerUrl).catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  });
}
