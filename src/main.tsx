import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Auto-update when new version is available
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    // Check for updates every hour
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
