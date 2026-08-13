// Shared application configuration. Feature modules import values from here
// instead of embedding application-level paths and DOM selectors.
export const APP_CONFIG = Object.freeze({
  serviceWorkerUrl: './sw.js',
  onlineStatus: Object.freeze({
    dotId: 'statusDot',
    textId: 'statusText',
    onlineLabel: 'Online',
    offlineLabel: 'Offline'
  })
});
