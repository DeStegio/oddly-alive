import { WeatherLayer } from '../../components/WeatherLayer';
import { useWeather } from '../../components/useWeather';
import styles from './HouseWindow.module.css';

/**
 * The Living Room window: the same sky the Mood Room's barometer sets, seen
 * from the sofa. Decorative (the weather is announced by the characters).
 */
export function HouseWindow() {
  const weather = useWeather();
  return (
    <div className={styles.frame} data-weather={weather} aria-hidden="true">
      <div className={styles.pane}>
        <WeatherLayer />
      </div>
      <span className={styles.mullion} />
      <span className={`${styles.curtain} ${styles.left}`} />
      <span className={`${styles.curtain} ${styles.right}`} />
      <span className={styles.sill} />
    </div>
  );
}
