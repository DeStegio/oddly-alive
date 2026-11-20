import { useKeepsakes } from '../../state/keepsakes';
import styles from './Attic.module.css';

/** How many letters Great-Aunt Pim left around the house. */
const LETTER_COUNT = 8;

/** Great-Aunt Pim's trunk, where her letters end up once they're found. */
export function Trunk() {
  const letters = useKeepsakes((s) => s.letters);
  return (
    <section className={styles.trunk} aria-labelledby="trunk-title">
      <h2 id="trunk-title" className={styles.thingTitle}>
        Great-Aunt Pim’s trunk
      </h2>
      <p className={styles.small}>
        {letters.length === 0
          ? 'Lavender and pencil shavings. A ribbon for tying letters, and no letters. There’s room for eight.'
          : `${letters.length} of ${LETTER_COUNT} letters, tied with a ribbon.`}
      </p>
    </section>
  );
}
