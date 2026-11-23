/**
 * Low-power switch for the art kit: the paper grain and parallax are the
 * expensive bits. `html[data-power="low"]` is set when the browser asks to
 * save data, the visitor prefers reduced motion or reduced data, or the
 * device reports few cores. CSS reads the attribute; nothing else changes.
 */
export function detectLowPower(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const mq = (q: string) => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
  return Boolean(nav.connection?.saveData) || mq('(prefers-reduced-data: reduce)') || mq('(prefers-reduced-motion: reduce)') || (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
}

export function applyPowerAttribute() {
  if (typeof document === 'undefined') return;
  if (detectLowPower()) document.documentElement.dataset.power = 'low';
  else delete document.documentElement.dataset.power;
}
