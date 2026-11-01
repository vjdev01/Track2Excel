import { useEffect, useState } from 'react';

export function useVisibleNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    function syncVisibility() {
      clearInterval(interval);
      interval = undefined;
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        interval = setInterval(() => setNow(Date.now()), intervalMs);
      }
    }
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('focus', syncVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('focus', syncVisibility);
    };
  }, [intervalMs]);
  return now;
}