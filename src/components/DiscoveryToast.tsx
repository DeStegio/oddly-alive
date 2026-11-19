import { useEffect, useState } from 'react';
import { SECRETS, secretById } from '../content/secrets';
import { useWorldStore } from '../state/worldStore';
import styles from './DiscoveryToast.module.css';

/**
 * A small paper note when something is discovered for the first time.
 * Polite live region, auto-dismisses, Escape closes it, never steals focus.
 */
export function DiscoveryToast() {
  const last = useWorldStore((s) => s.lastDiscovery);
  const count = useWorldStore((s) => Object.keys(s.discoveries).length);
  const [shown, setShown] = useState<{ id: string; at: number } | null>(null);

  useEffect(() => {
    if (!last || Date.now() - last.at > 10_000) return;
    setShown(last);
    const t = setTimeout(() => setShown(null), 4800);
    return () => clearTimeout(t);
  }, [last]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShown(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown]);

  const def = shown ? secretById(shown.id) : undefined;
  return (
    <div className={styles.region} aria-live="polite" aria-atomic="true">
      {def ? (
        <div key={shown?.at} className={styles.toast}>
          <p className={styles.kicker}>
            Secret found · {count} of {SECRETS.length}
          </p>
          <p className={styles.name}>{def.name}</p>
          <p className={styles.found}>{def.found}</p>
          <button type="button" className={styles.close} onClick={() => setShown(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
