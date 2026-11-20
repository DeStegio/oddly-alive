import { useState } from 'react';
import { ROOMS } from '../../app/rooms';
import { LETTERS, letterById } from '../../content/letters';
import { useKeepsakes } from '../../state/keepsakes';
import styles from './Attic.module.css';

/**
 * Great-Aunt Pim's trunk: her letters, tied with a ribbon, once they're
 * found. Missing ones leave a hint about which room still has one.
 */
export function Trunk() {
  const found = useKeepsakes((s) => s.letters);
  const [reading, setReading] = useState<string | null>(null);
  const letter = reading ? letterById(reading) : undefined;

  return (
    <section className={styles.trunk} aria-labelledby="trunk-title">
      <h2 id="trunk-title" className={styles.thingTitle}>
        Great-Aunt Pim’s trunk
      </h2>
      <p className={styles.small}>
        {found.length === 0
          ? 'Lavender and pencil shavings. A ribbon for tying letters, and no letters yet. There’s room for eight.'
          : `${found.length} of ${LETTERS.length} letters, tied with a ribbon.`}
      </p>
      <ol className={styles.letters}>
        {LETTERS.map((l) => {
          const have = found.includes(l.id);
          return (
            <li key={l.id}>
              {have ? (
                <button type="button" className={styles.envelope} aria-pressed={reading === l.id} onClick={() => setReading(reading === l.id ? null : l.id)}>
                  <span className={styles.envRoom}>{ROOMS[l.id].label}</span>
                  <span className={styles.envPlace}>{l.place}</span>
                </button>
              ) : (
                <p className={styles.missing}>
                  <span className={styles.envRoom}>{ROOMS[l.id].label}</span>
                  <span className={styles.envPlace}>{l.hint}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {letter ? (
        <article className={styles.letterPage} aria-label={`Letter found ${letter.place}`}>
          {letter.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className={styles.signoff}>{letter.signoff}</p>
          <button type="button" className="paper-btn" onClick={() => setReading(null)}>
            fold it up again
          </button>
        </article>
      ) : null}
    </section>
  );
}
