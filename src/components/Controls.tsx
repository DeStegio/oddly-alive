import { useWorld } from '../app/worldInstance';
import { useSettings } from '../state/settings';
import { ShareSheet } from './ShareSheet';
import styles from './Controls.module.css';

const isLate = () => {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
};

/**
 * Global switches with hand-drawn glyphs: sound (opt-in), motion, After
 * Hours. All are real toggles with aria-pressed; none depends on the clock.
 */
export function Controls() {
  const world = useWorld();
  const { sound, motion, afterHours, setSound, setMotion, setAfterHours } = useSettings();
  const late = isLate();
  return (
    <div className={styles.controls} role="group" aria-label="House settings">
      <button
        type="button"
        className={styles.btn}
        aria-pressed={sound}
        aria-label={sound ? 'Sound on' : 'Sound off'}
        title={sound ? 'Sound on' : 'Sound off (nothing plays until you turn it on)'}
        onClick={() => {
          setSound(!sound);
          world.emit('OBJECT_STATE_CHANGED', { target: 'settings', key: 'sound', value: !sound });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10 H 8 L 13 6 V 18 L 8 14 H 4 Z" />
          {sound ? <path d="M16 9 q 3 3 0 6 M18.5 7 q 5 5 0 10" /> : <path d="M16 9 l 5 6 M21 9 l -5 6" />}
        </svg>
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-pressed={motion === 'reduced'}
        aria-label={motion === 'reduced' ? 'Reduced motion on' : 'Reduced motion off'}
        title={motion === 'reduced' ? 'Calm motion' : 'Full motion'}
        onClick={() => setMotion(motion === 'reduced' ? 'full' : 'reduced')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {motion === 'reduced' ? <path d="M4 12 H 20" /> : <path d="M3 12 q 3 -6 6 0 t 6 0 t 6 0" />}
        </svg>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${late && !afterHours ? styles.hint : ''}`}
        aria-pressed={afterHours}
        aria-label={afterHours ? 'After Hours on' : 'After Hours off'}
        title={late && !afterHours ? 'It’s late. The house has after-hours ideas.' : 'After Hours'}
        onClick={() => {
          setAfterHours(!afterHours);
          world.emit('OBJECT_STATE_CHANGED', { target: 'settings', key: 'afterHours', value: !afterHours });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4 a 8 8 0 1 0 5 12 a 6 6 0 1 1 -5 -12 z" />
        </svg>
      </button>
      <ShareSheet />
    </div>
  );
}
