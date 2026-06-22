import { useState } from 'react';

const KEY = 'dashboard-guidance-visible';

export function useDashboardGuidanceVisible() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const hide = () => {
    setVisible(false);
    try { localStorage.setItem(KEY, 'false'); } catch {}
  };

  const show = () => {
    setVisible(true);
    try { localStorage.setItem(KEY, 'true'); } catch {}
  };

  return { visible, hide, show };
}
