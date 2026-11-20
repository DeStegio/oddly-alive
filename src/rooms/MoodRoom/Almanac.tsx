import type { ReactNode } from 'react';
import { ALMANAC } from '../../content/weather';
import { WEATHERS, type Weather } from '../../engine/weather';
import { useKeepsakes } from '../../state/keepsakes';
import styles from './Almanac.module.css';

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
const CLOUD = 'M10 30 a8 8 0 0 1 4-15 a10 10 0 0 1 19-2 a7 7 0 0 1 5 17 Z';

const ICONS: Record<Weather, ReactNode> = {
  clear: <circle cx="24" cy="22" r="10" {...INK} fill="var(--cut-paper)" />,
  sunny: (
    <g>
      <circle cx="24" cy="22" r="9" {...INK} fill="var(--yellow)" />
      <path d="M24 5v5M24 34v5M7 22h5M36 22h5M12 10l3 3M33 31l3 3M36 10l-3 3M15 31l-3 3" {...INK} />
    </g>
  ),
  windy: <path d="M6 16h24a5 5 0 1 0-5-5M6 24h32a5 5 0 1 1-5 5M6 32h18" {...INK} />,
  rain: (
    <g>
      <path d={CLOUD} {...INK} fill="var(--cut-paper)" />
      <path d="M14 35l-2 5M22 35l-2 5M30 35l-2 5" {...INK} stroke="var(--blue)" />
    </g>
  ),
  storm: (
    <g>
      <path d={CLOUD} {...INK} fill="#cfcad8" />
      <path d="M24 31l-5 7h6l-4 7" {...INK} stroke="var(--coral)" />
    </g>
  ),
  fog: <path d="M6 16h30M10 23h32M6 30h28M12 37h24" {...INK} opacity={0.7} />,
  snow: <path d="M24 8v28M12 15l24 14M36 15L12 29M20 9l4 4 4-4M20 35l4-4 4 4" {...INK} />,
  rainbow: <path d="M6 36a18 18 0 0 1 36 0M12 36a12 12 0 0 1 24 0M18 36a6 6 0 0 1 12 0" {...INK} stroke="var(--coral)" />,
  night: <path d="M28 8a14 14 0 1 0 10 22a11 11 0 1 1-10-22z" {...INK} fill="var(--yellow)" />,
};

const when = (at: number) =>
  new Date(at).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/** Nimbus's weather almanac: a page for every kind of weather the house has had. */
export function Almanac() {
  const seen = useKeepsakes((s) => s.almanac);
  const count = WEATHERS.filter((w) => w in seen).length;
  return (
    <section className={styles.almanac} aria-labelledby="almanac-title">
      <div className={styles.head}>
        <h2 id="almanac-title" className={styles.title}>
          Nimbus’s almanac
        </h2>
        <span className={styles.count}>
          {count} of {WEATHERS.length} kinds of weather
        </span>
      </div>
      <ol className={styles.cards}>
        {WEATHERS.map((w) => {
          const at = seen[w];
          return (
            <li key={w} className={styles.card} data-seen={at !== undefined}>
              <svg viewBox="0 0 48 46" className={styles.icon} aria-hidden="true">
                {at !== undefined ? ICONS[w] : <text x="24" y="32" textAnchor="middle" className={styles.unknown}>?</text>}
              </svg>
              <p className={styles.cardTitle}>{at !== undefined ? ALMANAC[w].title : 'Not yet'}</p>
              {at !== undefined ? (
                <>
                  <p className={styles.note}>{ALMANAC[w].note}</p>
                  <p className={styles.when}>first seen {when(at)}</p>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
