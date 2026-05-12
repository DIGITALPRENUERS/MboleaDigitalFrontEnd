import { useEffect, useRef } from 'react';

/**
 * Runs `callback` every `intervalMs` while the document tab is visible.
 * Pauses while hidden; when the tab becomes visible again, runs `callback` once then resumes.
 */
export function useVisibilityAwareInterval(callback, intervalMs) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (intervalMs == null || intervalMs <= 0) return undefined;

    let id = null;
    const tick = () => saved.current();

    const start = () => {
      if (id != null) clearInterval(id);
      id = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') {
      start();
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
