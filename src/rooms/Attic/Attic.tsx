import { LivingTitle } from '../../components/LivingTitle';
import styles from './Attic.module.css';

/** The attic (Phase 2). Filled in by the attic step. */
export default function Attic() {
  return (
    <section className={styles.room} aria-labelledby="attic-title">
      <LivingTitle id="attic-title" lines={['At', 'tic']} label="Attic" size="room" />
      <p className={styles.blurb}>Mind your head. Nobody has sorted the boxes.</p>
    </section>
  );
}
