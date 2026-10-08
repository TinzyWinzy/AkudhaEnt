import { useCallback, useEffect, useState } from 'react';

const cleanPath = (value: string) => {
  const path = value.split(/[?#]/, 1)[0] || '/';
  return path !== '/' ? path.replace(/\/+$/, '') : path;
};

export function usePathname() {
  const [pathname, setPathname] = useState(() => cleanPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPathname(cleanPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string, replace = false) => {
    const next = cleanPath(to);
    if (next === cleanPath(window.location.pathname)) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', next);
    setPathname(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return { pathname, navigate };
}
