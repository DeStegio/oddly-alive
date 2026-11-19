import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorld } from '../../app/worldInstance';
import { Inch } from '../../characters/Inch';
import { useActor } from '../../characters/useActor';
import styles from './Basement.module.css';

/**
 * Below the floorboards: an honest explanation of how the house works, a
 * hidden mini-scene, and a creaky floorboard in the footer.
 */
export function Basement() {
  const world = useWorld();
  const inch = useActor('inch');
  const [creaked, setCreaked] = useState(false);

  return (
    <section className={styles.basement} aria-labelledby="basement-title">
      <div className={styles.inner}>
        <p className={styles.kicker}>Under the floorboards</p>
        <h2 id="basement-title" className={styles.title}>
          How this house <em>works.</em>
        </h2>
        <div className={styles.cols}>
          <article>
            <h3>It notices.</h3>
            <p>
              Only what happens on this page: where your pointer wanders, what you click or drag, how you scroll, a
              few keys, and how long you’ve been quiet. Nothing else, nowhere else.
            </p>
          </article>
          <article>
            <h3>It has moods.</h3>
            <p>
              Ten of them, worked out from six numbers and a handful of rules. None of them are real feelings. All of
              them are performed with total sincerity.
            </p>
          </article>
          <article>
            <h3>It remembers, a little.</h3>
            <p>
              Visits and discoveries stay in your browser’s local storage and never leave it. The{' '}
              <Link to="/memory">Memory Room</Link> shows everything kept, and has a button that makes it forget.
            </p>
          </article>
        </div>

        <div className={styles.mouseHole} aria-hidden="true">
          <svg viewBox="0 0 220 120" className={styles.holeSvg}>
            <path d="M20 120 L 20 60 Q 20 10 110 10 Q 200 10 200 60 L 200 120 Z" fill="var(--char-ink)" />
            <rect x="60" y="78" width="70" height="28" rx="6" fill="var(--coral)" stroke="#000" strokeWidth="2" />
            <rect x="56" y="70" width="12" height="36" rx="4" fill="var(--coral)" stroke="#000" strokeWidth="2" />
            <rect x="122" y="70" width="12" height="36" rx="4" fill="var(--coral)" stroke="#000" strokeWidth="2" />
            <circle cx="160" cy="70" r="5" fill="var(--yellow)" />
            <line x1="160" y1="75" x2="160" y2="106" stroke="var(--yellow)" strokeWidth="2" />
            <rect x="80" y="30" width="30" height="22" fill="var(--yellow)" stroke="#000" strokeWidth="2" />
          </svg>
          <span className={styles.holeNote}>a very small living room</span>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.inch}>
          <Inch thought={inch.thought} rootRef={inch.rootRef} />
        </div>
        <p className={styles.credit}>
          Oddly Alive — a house with opinions. Built with React, TypeScript and a stubborn amount of SVG. No trackers
          were harmed because none were invited.
        </p>
        <button
          type="button"
          className={styles.board}
          data-creaked={creaked}
          onClick={(e) => {
            setCreaked(true);
            world.emit('OBJECT_CLICKED', { target: 'floorboard', repeat: 1, via: e.detail === 0 ? 'keyboard' : 'pointer' });
          }}
          aria-label="A loose floorboard"
        >
          <span aria-hidden="true">{creaked ? 'creeeak.' : 'this one creaks'}</span>
        </button>
      </footer>
    </section>
  );
}
