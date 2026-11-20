import { useEffect, useState } from 'react';
import { LETTERS, LETTER_TOAST, LETTER_TOAST_HINT, letterById } from '../content/letters';
import { useKeepsakes } from '../state/keepsakes';
import { useWorldStore } from '../state/worldStore';
import toast from './DiscoveryToast.module.css';
import styles from './LetterToast.module.css';

/** A note when one of Great-Aunt Pim's letters turns up (bottom right; discoveries use bottom left). */
export function LetterToast() {
  const last = useWorldStore((s) => s.lastLetter);
  const count = useKeepsakes((s) => s.letters.length);
  const [shown, setShown] = useState<{ id: string; at: number } | null>(null);

  useEffect(() => {
    if (!last || Date.now() - last.at > 10_000) return;
    setShown(last);
    const t = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(t);
  }, [last]);

  const letter = shown ? letterById(shown.id) : undefined;
  return (
    <div className={`${toast.region} ${styles.right}`} aria-live="polite" aria-atomic="true">
      {letter ? (
        <div key={shown?.at} className={`${toast.toast} ${styles.letter}`}>
          <p className={toast.kicker}>
            {LETTER_TOAST} · {count} of {LETTERS.length}
          </p>
          <p className={toast.found}>
            Found {letter.place}. {LETTER_TOAST_HINT}
          </p>
          <button type="button" className={toast.close} onClick={() => setShown(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
