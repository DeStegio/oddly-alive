import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorld } from '../../app/worldInstance';
import { useKeepsakes } from '../../state/keepsakes';
import { useWorldStore } from '../../state/worldStore';
import styles from './PullCord.module.css';

/** The cord shows up after a few discoveries, or after a while in the house (never a gate). */
const DISCOVERIES_NEEDED = 3;
const FALLBACK_MS = 5 * 60_000;

/**
 * A cord hanging from the Living Room ceiling. Pull it and the attic ladder
 * comes down; after that it's a way up.
 */
export function PullCord() {
  const world = useWorld();
  const unlocked = useKeepsakes((s) => s.attic.unlocked);
  const found = useWorldStore((s) => Object.keys(s.discoveries).length);
  const [late, setLate] = useState(() => performance.now() >= FALLBACK_MS);
  useEffect(() => {
    if (late) return;
    const t = window.setTimeout(() => setLate(true), Math.max(0, FALLBACK_MS - performance.now()));
    return () => window.clearTimeout(t);
  }, [late]);

  if (!unlocked && found < DISCOVERIES_NEEDED && !late) return null;

  const pull = () => {
    useKeepsakes.getState().unlockAttic();
    world.emit('OBJECT_STATE_CHANGED', { target: 'cord', key: 'pulled', value: true });
    world.effects.sound('press');
  };

  return (
    <div className={styles.cord} data-down={unlocked}>
      <span className={styles.string} aria-hidden="true" />
      {unlocked ? (
        <Link to="/attic" className={styles.ladder}>
          <span aria-hidden="true" className={styles.rungs} />
          Up to the attic
        </Link>
      ) : (
        <button type="button" className={`prop-btn ${styles.knob}`} aria-label="A cord hanging from the ceiling" onClick={pull}>
          <span aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
