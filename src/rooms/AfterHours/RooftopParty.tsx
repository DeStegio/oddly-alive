import { useEffect } from 'react';
import { useWorld } from '../../app/worldInstance';
import { useKeepsakes } from '../../state/keepsakes';
import styles from './RooftopParty.module.css';

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const eyes = (x: number, y: number, gap = 8) => (
  <g fill="var(--char-ink)">
    <circle cx={x - gap / 2} cy={y} r="2.2" />
    <circle cx={x + gap / 2} cy={y} r="2.2" />
  </g>
);

/** Everyone, small, standing on the roof. */
const GUESTS: Array<{ name: string; art: React.ReactNode }> = [
  {
    name: 'Lumen',
    art: (
      <g>
        <path d="M14 8 H 34 L 40 30 H 8 Z" fill="var(--yellow)" {...INK} />
        <path d="M24 30 V 60 M14 62 H 34" fill="none" {...INK} />
        {eyes(24, 20)}
      </g>
    ),
  },
  {
    name: 'Tick',
    art: (
      <g>
        <circle cx="24" cy="36" r="18" fill="var(--paper)" {...INK} />
        {eyes(24, 32)}
        <path d="M24 36 L 30 42" {...INK} />
      </g>
    ),
  },
  {
    name: 'Dot',
    art: (
      <g>
        <circle cx="24" cy="44" r="14" fill="var(--blue)" {...INK} />
        <circle cx="26" cy="42" r="5" fill="#fff" {...INK} strokeWidth={1.5} />
        <circle cx="27" cy="42" r="2" fill="var(--char-ink)" />
      </g>
    ),
  },
  {
    name: 'Nimbus',
    art: (
      <g>
        <path d="M8 50 C 0 50 0 36 10 34 C 8 22 22 18 28 26 C 32 16 46 18 46 30 C 52 32 50 50 40 50 Z" fill="#fffaf1" {...INK} />
        {eyes(26, 38)}
      </g>
    ),
  },
  {
    name: 'Ferdinand',
    art: (
      <g>
        <path d="M14 42 H 34 L 31 60 H 17 Z" fill="var(--yellow)" {...INK} />
        <path d="M24 42 C 18 30 10 28 8 20 M24 42 C 28 28 36 26 40 18 M24 42 V 22" fill="none" {...INK} stroke="#3f7a52" strokeWidth={3} />
      </g>
    ),
  },
  {
    name: 'Bip',
    art: (
      <g>
        <rect x="8" y="18" width="32" height="22" rx="7" fill="var(--blue)" {...INK} />
        <rect x="12" y="22" width="24" height="14" rx="4" fill="#24232b" />
        <g fill="#a6f0c6">
          <rect x="16" y="25" width="4" height="6" rx="2" />
          <rect x="28" y="25" width="4" height="6" rx="2" />
        </g>
        <rect x="12" y="40" width="24" height="18" rx="5" fill="var(--mint)" {...INK} />
      </g>
    ),
  },
  {
    name: 'Marguerite',
    art: (
      <g>
        <path d="M16 16 C 8 20 8 34 12 40 C 8 48 10 58 14 62 H 34 C 38 58 40 48 36 40 C 40 34 40 20 32 16 Z" fill="#e8d5c4" {...INK} />
        <path d="M14 14 L 15 4 L 20 9 L 24 2 L 28 9 L 33 4 L 34 14 Z" fill="var(--yellow)" {...INK} />
      </g>
    ),
  },
  {
    name: 'Inch',
    art: <path d="M6 58 C 6 50 14 50 16 54 C 20 38 34 38 36 54 C 38 48 44 48 44 50" fill="none" stroke="var(--mint)" strokeWidth={8} strokeLinecap="round" />,
  },
];

/**
 * The finale: after all eight of Great-Aunt Pim's letters, the whole house
 * turns up on the roof. Bunting and a few slow fireworks (fades, never flashes).
 */
export function RooftopParty() {
  const world = useWorld();
  useEffect(() => {
    world.effects.discover('family-reunion');
    useKeepsakes.getState().note('finale', 'Everyone went up on the roof. Even Marguerite. Somebody brought the radio.', { once: true });
    world.emit('OBJECT_STATE_CHANGED', { target: 'roof', key: 'party', value: true });
  }, [world]);

  return (
    <div className={styles.party} role="img" aria-label="Everyone in the house is up on the roof">
      <div className={styles.bunting} />
      <div className={styles.fireworks}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={styles.burst} style={{ left: `${18 + i * 22}%`, animationDelay: `${i * 1.3}s` }} />
        ))}
      </div>
      <p className={styles.caption}>Everyone’s here. Somebody brought the radio up.</p>
      <ul className={styles.guests}>
        {GUESTS.map((g) => (
          <li key={g.name} className={styles.guest} title={g.name}>
            <svg viewBox="0 0 48 66">{g.art}</svg>
          </li>
        ))}
      </ul>
    </div>
  );
}
