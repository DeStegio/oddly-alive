import { memo } from 'react';
import type { Weather } from '../engine/weather';
import { useWeather } from './useWeather';
import styles from './WeatherLayer.module.css';

const COUNTS: Partial<Record<Weather, number>> = { rain: 26, storm: 32, snow: 20, windy: 7 };

/** Deterministic spread so particles never re-shuffle between renders. */
const spread = (i: number, salt: number) => ((i * 7919 + salt * 104729) % 1000) / 1000;

interface Props {
  /**
   * `pane`: full strength, meant for a framed window or sky.
   * `ambient`: a faint touch over a whole room.
   */
  variant?: 'pane' | 'ambient';
  /** Override (e.g. a Nimbus visit); defaults to the house weather. */
  weather?: Weather;
  className?: string;
}

/**
 * CSS-only weather: rain streaks, snow, blown leaves, fog, a rainbow, sun or a
 * darker sky. Particle counts are capped; animation stops for reduced motion.
 * Purely decorative (aria-hidden) and never takes pointer events.
 */
export const WeatherLayer = memo(function WeatherLayer({ variant = 'pane', weather: override, className }: Props) {
  const house = useWeather();
  const weather = override ?? house;
  const n = COUNTS[weather] ?? 0;
  const count = variant === 'ambient' ? Math.ceil(n / 2) : n;
  return (
    <div className={`${styles.layer} ${className ?? ''}`} data-weather={weather} data-variant={variant} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={`${weather}-${i}`}
          className={styles.p}
          style={
            {
              '--x': `${(spread(i, 1) * 100).toFixed(1)}%`,
              '--d': `${(-spread(i, 2) * 4).toFixed(2)}s`,
              '--s': (0.6 + spread(i, 3) * 0.8).toFixed(2),
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
});
