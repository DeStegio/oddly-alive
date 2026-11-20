import { useEffect, useState } from 'react';
import { PIN_EFFECTS } from '../../content/weather';
import { WEATHER_NAMES, type Weather } from '../../engine/weather';
import { useWorldStore } from '../../state/worldStore';
import styles from './Barometer.module.css';

/** The stations on the dial, left to right (clear means "let the mood decide"). */
const STATIONS: Weather[] = ['sunny', 'windy', 'rain', 'storm', 'fog', 'snow', 'rainbow', 'night'];

const angleOf = (w: Weather) => {
  const i = STATIONS.indexOf(w);
  return i < 0 ? 0 : -90 + (i + 0.5) * (180 / STATIONS.length);
};

function useSecondsLeft(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}

interface Props {
  onPin: (w: Weather) => void;
  onRelease: () => void;
}

/**
 * Pin the house weather for a few minutes. The needle shows what the house is
 * doing right now (pinned or not); the caption says what the pin will change.
 */
export function Barometer({ onPin, onRelease }: Props) {
  const weather = useWorldStore((s) => s.weather);
  const pin = useWorldStore((s) => s.weatherPin);
  const left = useSecondsLeft(pin?.until ?? null);
  const [focus, setFocus] = useState<Weather>(pin?.weather ?? weather);
  const shown = pin?.weather ?? focus;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <section className={styles.card} aria-labelledby="baro-title">
      <div className={styles.head}>
        <h2 id="baro-title" className={styles.title}>
          Barometer
        </h2>
        <p className={styles.state} aria-live="polite">
          {pin ? `Pinned to ${WEATHER_NAMES[pin.weather]} · ${mm}:${ss}` : `Following the mood: ${WEATHER_NAMES[weather]}`}
        </p>
      </div>

      <div className={styles.body}>
        <svg viewBox="0 0 120 70" className={styles.dial} aria-hidden="true">
          <path d="M10 64 A 50 50 0 0 1 110 64" fill="var(--paper)" stroke="var(--char-ink)" strokeWidth="3" />
          {STATIONS.map((w) => (
            <line key={w} x1="60" y1="20" x2="60" y2="26" stroke="var(--char-ink)" strokeWidth="2" strokeLinecap="round" transform={`rotate(${angleOf(w)} 60 64)`} />
          ))}
          <g className={styles.needle} style={{ transform: `rotate(${STATIONS.includes(weather) ? angleOf(weather) : 0}deg)` }}>
            <line x1="60" y1="64" x2="60" y2="24" stroke="var(--coral)" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <circle cx="60" cy="64" r="5" fill="var(--char-ink)" />
        </svg>

        <div className={styles.stations} role="group" aria-label="Pin the weather">
          {STATIONS.map((w) => (
            <button
              key={w}
              type="button"
              className={styles.station}
              aria-pressed={pin?.weather === w}
              onClick={() => onPin(w)}
              onMouseEnter={() => setFocus(w)}
              onFocus={() => setFocus(w)}
            >
              {WEATHER_NAMES[w]}
            </button>
          ))}
          <button type="button" className={`${styles.station} ${styles.release}`} disabled={!pin} onClick={onRelease}>
            let the mood decide
          </button>
        </div>
      </div>
      <p className={styles.effect}>{PIN_EFFECTS[shown]}</p>
    </section>
  );
}
