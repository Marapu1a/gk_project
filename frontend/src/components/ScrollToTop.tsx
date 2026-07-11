import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Keeps every page navigation predictable, including browser and in-app Back. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}
