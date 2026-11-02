import { useEffect } from 'react';

/**
 * Tells search engines not to index this page. The web server answers every address with the app
 * (status 200), so "not found" pages say so this way instead.
 */
export function useNoIndex(active = true) {
  useEffect(() => {
    if (!active) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [active]);
}
