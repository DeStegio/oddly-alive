import { useState } from 'react';
import { useObjects } from '../../state/world';
import styles from './FieldNotes.module.css';
import { GOALS, goalsDone, type PileStats } from './goals';

const TIPS = [
  'Balloons do not believe in gravity.',
  'Blocks are heavy. Pebbles are not. Plan accordingly.',
  'Throw hard enough and things get dizzy.',
  'Throw really hard and things leave the tray. Left or up: gone. Right: Bip.',
  'Volleyball rule: catch Bip’s return before it touches your floor.',
  'Tap empty floor to poke the pile.',
  'Dominoes like to stand in a line. Briefly.',
  'Arrow keys push a focused shape. Enter makes it hop.',
];

/** The Playground's right-hand page: Dot keeps score and hands out small goals. */
export function FieldNotes({ stats }: { stats: PileStats }) {
  const done = goalsDone(useObjects((s) => s.playground.goals));
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]!);
  const reached = GOALS.filter((g) => done.has(g.id)).length;

  return (
    <aside className={styles.notes} aria-labelledby="pg-notes-title">
      <header className={styles.head}>
        <h2 id="pg-notes-title" className={styles.title}>
          Field notes
        </h2>
        <p className={styles.byline}>kept (badly) by Dot</p>
      </header>

      <dl className={styles.stats}>
        <div>
          <dt>on the floor</dt>
          <dd>{stats.count}</dd>
        </div>
        <div>
          <dt>tallest stack</dt>
          <dd>{stats.tallest}</dd>
        </div>
        <div>
          <dt>fastest throw</dt>
          <dd>{stats.bestThrow > 0 ? stats.bestThrow.toFixed(1) : '–'}</dd>
        </div>
        <div>
          <dt>best rally</dt>
          <dd>{stats.bestRally}</dd>
        </div>
      </dl>

      <section className={styles.goals} aria-labelledby="pg-goals-title">
        <div className={styles.goalsHead}>
          <h3 id="pg-goals-title" className={styles.goalsTitle}>
            Little goals
          </h3>
          <span className={styles.progress}>
            {reached} / {GOALS.length}
          </span>
        </div>
        <div className={styles.bar} aria-hidden="true">
          <span style={{ width: `${(reached / GOALS.length) * 100}%` }} />
        </div>
        <ul className={styles.list}>
          {GOALS.map((g) => {
            const ok = done.has(g.id);
            return (
              <li key={g.id} className={styles.goal} data-done={ok}>
                <svg className={styles.box} viewBox="0 0 22 22" aria-hidden="true">
                  <rect x="2" y="2" width="18" height="18" rx="5" />
                  {ok ? <path className={styles.tick} d="M6 11.5 L9.5 15 L16 7" /> : null}
                </svg>
                <span>
                  {g.label}
                  {ok ? <span className="visually-hidden"> (done)</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
        {reached === GOALS.length ? (
          <p className={styles.allDone}>Every goal reached. Dot is speechless (briefly).</p>
        ) : null}
      </section>

      <p className={styles.tip}>
        <span className={styles.tipTag}>tip</span> {tip}
      </p>
    </aside>
  );
}
