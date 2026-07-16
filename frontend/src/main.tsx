import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'react-datepicker/dist/react-datepicker.css';

const PRELOAD_RECOVERY_KEY = 'vite-preload-recovery';

window.addEventListener('vite:preloadError', (event) => {
  if (sessionStorage.getItem(PRELOAD_RECOVERY_KEY) === '1') {
    sessionStorage.removeItem(PRELOAD_RECOVERY_KEY);
    return;
  }

  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RECOVERY_KEY, '1');
  window.location.reload();
});

window.setTimeout(() => {
  sessionStorage.removeItem(PRELOAD_RECOVERY_KEY);
}, 10_000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
