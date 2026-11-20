import { WeatherLayer } from '../../components/WeatherLayer';
import { useWeather } from '../../components/useWeather';
import { useKeepsakes } from '../../state/keepsakes';
import styles from './HouseWindow.module.css';

/**
 * The Living Room window: the same sky the Mood Room's barometer sets, seen
 * from the sofa. Decorative (the weather is announced by the characters).
 */
export function HouseWindow() {
  const weather = useWeather();
  // flowers picked in the garden end up on this sill
  const vase = useKeepsakes((s) => s.garden.vase).slice(-5);
  return (
    <div className={styles.frame} data-weather={weather} aria-hidden="true">
      <div className={styles.pane}>
        <WeatherLayer />
      </div>
      <span className={styles.mullion} />
      <span className={`${styles.curtain} ${styles.left}`} />
      <span className={`${styles.curtain} ${styles.right}`} />
      <span className={styles.sill} />
      {vase.length ? (
        <span className={styles.vase}>
          {vase.map((k, i) => (
            <span key={i} className={styles.stem} data-kind={k} style={{ rotate: `${(i - (vase.length - 1) / 2) * 14}deg` }} />
          ))}
          <span className={styles.jar} />
        </span>
      ) : null}
    </div>
  );
}
