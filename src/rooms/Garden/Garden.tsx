import { LivingTitle } from '../../components/LivingTitle';
import styles from './Garden.module.css';

/** The back garden (Phase 2). Filled in by the garden step; for now, the beds are dug. */
export default function Garden() {
  return (
    <section className={styles.room} aria-labelledby="garden-title">
      <LivingTitle id="garden-title" lines={['Gar', 'den']} label="Garden" size="room" />
      <p className={styles.blurb}>The beds are dug. Nothing’s in them yet.</p>
    </section>
  );
}
