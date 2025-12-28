import { useEffect, useState, useRef } from 'react';
import { getMonthlyVisitorCount } from '../lib/analytics';

export function useMonthlyListeners(pollIntervalMs = 60_000) {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function update() {
      try {
        const c = await getMonthlyVisitorCount();
        if (mountedRef.current) setCount(c);
      } catch (e) {
        // ignore for demo
      }
    }

    // Allow external code to trigger an immediate refresh via a window event
    function onRefreshEvent() {
      update();
    }

    update();
    const id = setInterval(update, pollIntervalMs);
    window.addEventListener('monthlyListeners:refresh', onRefreshEvent);

    function onVisibility() {
      if (document.visibilityState === 'visible') update();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
      window.removeEventListener('monthlyListeners:refresh', onRefreshEvent);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pollIntervalMs]);

  return count;
}
