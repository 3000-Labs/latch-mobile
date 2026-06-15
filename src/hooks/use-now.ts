import { useEffect, useState } from 'react';

/**
 * Re-renders the calling component every `intervalMs` and returns the current
 * epoch ms. Drives live countdowns (cosign expiry) without each row owning a
 * timer. The interval is torn down on unmount, so a screen with nothing to
 * count down stops ticking once its rows disappear.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
