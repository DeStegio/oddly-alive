import { useEffect, useMemo, useState } from 'react';
import { findLetter } from '../../app/letters';
import { Link } from 'react-router-dom';
import { clearMemory, composeMemory, getMemoryManager, resetSession, resetWorld, setMemoryEnabled } from '../../app/memorySync';
import { ROOMS } from '../../app/rooms';
import { useWorld } from '../../app/worldInstance';
import { RoomTag } from '../../art/Stage';
import { favoriteOf, nickname } from '../../content/nickname';
import { SECRETS } from '../../content/secrets';
import { mergeCounts } from '../../engine/world';
import { useSettings } from '../../state/settings';
import { useWorldStore } from '../../state/worldStore';
import styles from './MemoryRoom.module.css';

const OBJECT_NAMES: Record<string, string> = {
  pim: 'Pim',
  dot: 'Dot',
  lumen: 'Lumen the lamp',
  tick: 'Tick the clock',
  ferdinand: 'Ferdinand the fern',
  button: 'the do-not-press button',
  picture: 'Great-Aunt Pim’s portrait',
  bunny: 'the dust bunny',
  wall: 'the wall',
  nimbus: 'Nimbus',
  chest: 'the chest',
  candle: 'the candle',
};
const nameOf = (id: string) => OBJECT_NAMES[id] ?? id.replace(/^(shape|mood|token):/, '').replace(/^playground:floor$/, 'the playground floor');

const ACTIVITY: Array<{ key: string; label: string }> = [
  { key: 'OBJECT_CLICKED', label: 'Pokes & clicks' },
  { key: 'POINTER_ENTERED', label: 'Close approaches' },
  { key: 'OBJECT_DRAGGED', label: 'Drags & throws' },
  { key: 'OBJECT_COLLIDED', label: 'Collisions caused' },
  { key: 'SCROLL_CHANGED', label: 'Scroll nudges' },
  { key: 'KEY_PRESSED', label: 'Keys typed' },
  { key: 'USER_IDLE', label: 'Quiet moments' },
];

function Tally({ n }: { n: number }) {
  const shown = Math.min(n, 40);
  const groups = Math.ceil(shown / 5);
  return (
    <svg viewBox={`0 0 ${Math.max(1, groups) * 46} 44`} className={styles.tally} role="img" aria-label={`${n} visits`}>
      {Array.from({ length: groups }, (_, g) => {
        const inGroup = Math.min(5, shown - g * 5);
        return (
          <g key={g} transform={`translate(${g * 46 + 4} 4)`} stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            {Array.from({ length: Math.min(4, inGroup) }, (_, i) => (
              <line key={i} x1={i * 8} y1={2 + (i % 2)} x2={i * 8 + 1} y2={34} />
            ))}
            {inGroup === 5 ? <line x1={-3} y1={28} x2={30} y2={8} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

export default function MemoryRoom() {
  const world = useWorld();
  const s = useWorldStore();
  const memoryEnabled = useSettings((st) => st.memoryEnabled);
  const hints = useSettings((st) => st.hints);
  const [confirm, setConfirm] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [notice, setNotice] = useState('');
  // a letter comes by post on the third visit
  const visits = s.visits;
  useEffect(() => {
    if (visits >= 3) findLetter(world, 'memory');
  }, [visits, world]);

  const lifetime = useMemo(() => mergeCounts(s.pastCounts, Object.fromEntries(Object.entries(s.counts).filter(([k]) => !k.startsWith('hover:')))), [s.pastCounts, s.counts]);
  const favorites = Object.entries(lifetime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const fav = favoriteOf(lifetime);
  const discovered = Object.keys(s.discoveries).length;
  const name = nickname({ counts: lifetime, visits: s.visits, discoveries: discovered });
  const totals = mergeCounts(s.pastEventTotals, s.eventTotals);
  const maxActivity = Math.max(1, ...ACTIVITY.map((a) => totals[a.key] ?? 0));

  const raw = showRaw ? (memoryEnabled ? JSON.stringify(composeMemory(Date.now()), null, 2) : '(memory is off — nothing is stored)') : '';
  const status: Record<typeof s.memoryStatus, string> = {
    fresh: 'This is the first visit this browser remembers.',
    restored: 'Memory restored from this browser.',
    migrated: 'Memory restored (and tidied up from an older format).',
    corrupt: 'The stored memory was unreadable, so the house started fresh.',
    unavailable: 'This browser won’t let the house store anything, so it only remembers until you leave.',
    disabled: 'Memory is off. Nothing is being stored.',
  };

  return (
    <section className={styles.room} aria-labelledby="memory-title">
      <header className={styles.head}>
        <RoomTag id="memory-title" label="Memory Room" />
        <p className={styles.blurb}>All of this lives in this browser only. Nothing is ever sent anywhere.</p>
      </header>

      <div className={styles.board}>
        {/* name plate */}
        <article className={`${styles.card} ${styles.plate}`}>
          <p className={styles.kicker}>The house calls you</p>
          <p className={styles.nickname}>{name}</p>
          <p className={styles.small}>
            {fav ? `Because you keep visiting ${nameOf(fav)}.` : 'Interact with something a few times and you’ll earn a better name.'}
          </p>
        </article>

        {/* visits */}
        <article className={`${styles.card} ${styles.visits}`}>
          <p className={styles.kicker}>Visits</p>
          <Tally n={s.visits} />
          <p className={styles.small}>
            {s.visits === 1 ? 'Your first visit (as far as this browser knows).' : `${s.visits} visits since ${new Date(s.firstVisit).toLocaleDateString()}.`}
            {s.lastVisitRoom ? (
              <>
                {' '}
                Last time you were in the <Link to={ROOMS[s.lastVisitRoom].path}>{ROOMS[s.lastVisitRoom].label}</Link>.
              </>
            ) : null}
          </p>
        </article>

        {/* favourites as polaroids */}
        <article className={`${styles.card} ${styles.favs}`}>
          <p className={styles.kicker}>Favourite things to poke</p>
          {favorites.length ? (
            <ol className={styles.polaroids}>
              {favorites.map(([id, n], i) => (
                <li key={id} className={styles.polaroid} style={{ rotate: `${(i - 1) * 4}deg` }}>
                  <span className={styles.photo} data-kind={id.split(':')[0]} aria-hidden="true">
                    {nameOf(id).replace(/^the /, '').slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.caption}>
                    {nameOf(id)} <b>×{n}</b>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.small}>Nothing yet. The house is waiting to see what you like.</p>
          )}
        </article>

        {/* discoveries */}
        <article className={`${styles.card} ${styles.secrets}`}>
          <p className={styles.kicker}>Secrets found</p>
          <p className={styles.big}>
            {discovered} <span>/ {SECRETS.length}</span>
          </p>
          <div className={styles.progress} aria-hidden="true">
            <span style={{ width: `${(discovered / SECRETS.length) * 100}%` }} />
          </div>
          <p className={styles.small}>
            The full collection (and hints) lives in the <Link to="/secret">Secret Space</Link>.
          </p>
        </article>

        {/* activity chart: one series, so no legend; values as text */}
        <article className={`${styles.card} ${styles.activity}`}>
          <p className={styles.kicker}>How you’ve played (all visits)</p>
          <ul className={styles.bars}>
            {ACTIVITY.map((a) => {
              const v = totals[a.key] ?? 0;
              return (
                <li key={a.key} className={styles.barRow} title={`${a.label}: ${v}`}>
                  <span className={styles.barLabel}>{a.label}</span>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span className={styles.bar} style={{ width: `${Math.max(v ? 2 : 0, (v / maxActivity) * 100)}%` }} />
                  </span>
                  <span className={styles.barValue}>{v}</span>
                </li>
              );
            })}
          </ul>
          <p className={styles.small}>Moods seen this visit: {s.moodsSeen.join(', ')}.</p>
        </article>

        {/* privacy + controls */}
        <article className={`${styles.card} ${styles.controls}`}>
          <p className={styles.kicker}>What’s stored, exactly</p>
          <p className={styles.small}>{status[s.memoryStatus]}</p>
          <ul className={styles.stored}>
            <li>visit count, first and last visit date</li>
            <li>which secrets you found</li>
            <li>how often you poked each object (top 40)</li>
            <li>totals of a few interaction kinds, rooms visited, the last room</li>
            <li>how much the house trusts you (a number between 0 and 1)</li>
            <li>your motion and After Hours settings (sound always starts off)</li>
            <li>keepsakes: garden jobs done and Herbarium pages, postcards answered and the sandbox valley, the attic’s Memory Board, letters found, kinds of weather seen, personal bests</li>
            <li>a short house diary (up to 40 lines) with the date of a few big moments, like a first discovery</li>
          </ul>
          <p className={styles.small}>Never stored: where your pointer went, what you typed, a log of everything you did, anything about you.</p>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(e) => {
                setMemoryEnabled(e.target.checked);
                setNotice(e.target.checked ? 'Memory is on. The house will remember this browser.' : 'Memory is off. Stored data was deleted.');
              }}
            />
            <span>Let the house remember me</span>
          </label>
          <label className={styles.toggle}>
            <input type="checkbox" checked={hints} onChange={(e) => useSettings.getState().setHints(e.target.checked)} />
            <span>Hints when I seem stuck (in the Garden, the Weather Workshop and the Attic)</span>
          </label>

          <button type="button" className="paper-btn" aria-expanded={showRaw} onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? 'Hide raw data' : 'Show raw data'}
          </button>
          {showRaw ? <pre className={styles.raw}>{raw}</pre> : null}

          <div className={styles.actions}>
            <div>
              <button
                type="button"
                className="paper-btn"
                onClick={() => {
                  resetSession(world);
                  setNotice('Session reset: moods and reactions calmed down. Memory kept.');
                }}
              >
                Reset session
              </button>
              <p className={styles.tiny}>Calms the moods and reactions. Keeps memory and rooms.</p>
            </div>
            <div>
              <button
                type="button"
                className="paper-btn"
                onClick={() => {
                  resetWorld(world);
                  setNotice('World reset: every room is tidy again. Memory kept.');
                }}
              >
                Reset world
              </button>
              <p className={styles.tiny}>Tidies every room (lamp, button, portrait, cabinet, night). Keeps memory.</p>
            </div>
            <div>
              {confirm ? (
                <span className={styles.confirm}>
                  Really forget everything?{' '}
                  <button
                    type="button"
                    className={`paper-btn ${styles.danger}`}
                    onClick={() => {
                      clearMemory(world);
                      setConfirm(false);
                      setNotice(getMemoryManager().raw() === null ? 'Forgotten. The house no longer knows you.' : 'Tried to forget, but the browser refused.');
                    }}
                  >
                    Yes, forget me
                  </button>{' '}
                  <button type="button" className="paper-btn" onClick={() => setConfirm(false)}>
                    Keep it
                  </button>
                </span>
              ) : (
                <button type="button" className={`paper-btn ${styles.danger}`} onClick={() => setConfirm(true)}>
                  Forget me
                </button>
              )}
              <p className={styles.tiny}>Clears local memory: visits, secrets, nickname, settings.</p>
            </div>
          </div>
          <p className={styles.notice} role="status">
            {notice}
          </p>
        </article>
      </div>
    </section>
  );
}
