// Application-shell concerns are deliberately isolated from feature modules.
// This file owns connectivity feedback and Service Worker registration.

function updateOnlineStatus() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (!dot || !text) return;

  if (navigator.onLine) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
    text.textContent = 'Online';
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    text.textContent = 'Offline';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  });
}
