import { useEffect, useRef, useState } from 'react';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { useCharacter } from '../../characters/useCharacter';
import { LivingTitle } from '../../components/LivingTitle';
import { SECRETS } from '../../content/secrets';
import { onFrame } from '../../engine/frameLoop';
import { pointer } from '../../engine/pointer';
import { isReducedMotion } from '../../state/settings';
import { useObjects } from '../../state/world';
import { useWorldStore } from '../../state/worldStore';
import { Glyph } from './Glyph';
import { SOLUTION, TOKENS } from './puzzle';
import styles from './SecretSpace.module.css';


export default function SecretSpace() {
  const world = useWorld();
  const discoveries = useWorldStore((s) => s.discoveries);
  const secret = useObjects((s) => s.secret);
  const setSlice = useObjects((s) => s.setSlice);
  const roomRef = useRef<HTMLElement>(null);
  const chest = useCharacter('room', 'neutral');
  const aunt = useCharacter('aunt', 'neutral');
  const [showHints, setShowHints] = useState(false);
  const slots = secret.slots ? secret.slots.split(',') : [];
  const solved = secret.slots === SOLUTION;

  // a torch that follows the pointer through the dark (INT-086)
  useEffect(() => {
    const el = roomRef.current;
    if (!el) return;
    let x = 50;
    let y = 40;
    return onFrame(() => {
      if (isReducedMotion() || !pointer.active) return;
      const r = el.getBoundingClientRect();
      const tx = ((pointer.x - r.left) / r.width) * 100;
      const ty = ((pointer.y - r.top) / r.height) * 100;
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.setProperty('--mx', `${x.toFixed(1)}%`);
      el.style.setProperty('--my', `${y.toFixed(1)}%`);
    });
  }, []);

  const emitClick = (target: string, e: React.MouseEvent) =>
    world.emit('OBJECT_CLICKED', { target, repeat: 1, via: e.detail === 0 ? 'keyboard' : 'pointer' });

  const placeToken = (id: string) => (e: React.MouseEvent) => {
    if (slots.includes(id) || slots.length >= 3) return;
    const next = [...slots, id].join(',');
    setSlice('secret', { slots: next });
    emitClick(`token:${id}`, e);
    if (next.split(',').length === 3) world.emit('OBJECT_STATE_CHANGED', { target: 'cabinet', key: 'slots', value: next });
  };

  return (
    <section ref={roomRef} className={styles.room} data-candle={secret.candleLit} aria-labelledby="secret-title">
      <div className={styles.dark} aria-hidden="true" />
      <header className={styles.head}>
        <LivingTitle id="secret-title" lines={['Secret', 'Space']} label="Secret Space" size="room" />
        <p className={styles.blurb}>You were never here. Everything the house has been hiding ends up on these shelves.</p>
      </header>

      <div className={styles.grid}>
        {/* the cabinet of discoveries */}
        <div className={styles.cabinet}>
          <div className={styles.cabinetHead}>
            <h2 className={styles.h2}>
              The cabinet <span>{Object.keys(discoveries).length} / {SECRETS.length}</span>
            </h2>
            <button type="button" className="paper-btn" aria-pressed={showHints} onClick={() => setShowHints((v) => !v)}>
              {showHints ? 'Hide hints' : 'Show hints'}
            </button>
          </div>
          <ul className={styles.shelves}>
            {SECRETS.map((s) => {
              const found = s.id in discoveries;
              return (
                <li key={s.id} className={styles.slot} data-found={found}>
                  <span className={styles.glyph}>{found ? <Glyph name={s.glyph} /> : <span className={styles.q}>?</span>}</span>
                  <span className={styles.slotName}>{found ? s.name : '???'}</span>
                  {found ? <span className={styles.slotText}>{s.found}</span> : showHints ? <span className={styles.slotText}>{s.hint}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.side}>
          {/* the chest (needs the key from the Playground) */}
          <div ref={chest.rootRef} className={styles.chestWrap}>
            <ThoughtBubble text={chest.thought} />
            <button
              type="button"
              className={styles.chest}
              data-open={secret.chestOpen}
              aria-label={secret.chestOpen ? 'The open chest. There is a sock inside.' : 'A locked chest'}
              onClick={(e) => {
                emitClick('chest', e);
                if (secret.chestOpen) findLetter(world, 'secret');
                if (secret.keyFound && !secret.chestOpen) {
                  setSlice('secret', { chestOpen: true });
                  world.emit('OBJECT_STATE_CHANGED', { target: 'chest', key: 'open', value: true });
                }
              }}
            >
              <svg viewBox="0 0 160 120" aria-hidden="true">
                <rect x="14" y="52" width="132" height="62" rx="6" fill="#8a5a3c" stroke="var(--char-ink)" strokeWidth="3" />
                {secret.chestOpen ? (
                  <g>
                    <path d="M58 54 C 52 30 66 22 76 30 L 92 50 L 104 46 L 104 60 L 70 60 Z" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="2.5" />
                    <path d="M14 52 L 30 10 L 162 10 L 146 52 Z" fill="#a46b47" stroke="var(--char-ink)" strokeWidth="3" />
                  </g>
                ) : (
                  <path d="M14 52 Q 80 6 146 52 Z" fill="#a46b47" stroke="var(--char-ink)" strokeWidth="3" />
                )}
                <rect x="70" y="60" width="20" height="24" rx="3" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2.5" />
                <circle cx="80" cy="70" r="3" fill="var(--char-ink)" />
                <path d="M14 76 H 146" stroke="var(--char-ink)" strokeWidth="2" opacity="0.5" />
              </svg>
            </button>
            <p className={styles.caption}>{secret.chestOpen ? 'One sock. Extremely lost. Now found.' : secret.keyFound ? 'The key fits. Probably.' : 'Locked. The key wandered off somewhere bouncy.'}</p>
          </div>

          {/* token puzzle */}
          <div className={styles.puzzle}>
            <p className={styles.note}>“First the night, then the green, then the thing you shouldn’t press.”</p>
            <div className={styles.slots} role="group" aria-label="Three slots">
              {[0, 1, 2].map((i) => (
                <span key={i} className={styles.tokenSlot} data-filled={Boolean(slots[i])} data-solved={solved}>
                  {slots[i] ? <TokenIcon id={slots[i] as string} /> : null}
                </span>
              ))}
            </div>
            <div className={styles.tokens}>
              {TOKENS.map((t) => (
                <button key={t.id} type="button" className={styles.token} disabled={slots.includes(t.id) || solved} onClick={placeToken(t.id)} aria-label={`Place ${t.label}`}>
                  <TokenIcon id={t.id} />
                </button>
              ))}
            </div>
            {solved ? (
              <div ref={aunt.rootRef} className={styles.aunt}>
                <ThoughtBubble text={aunt.thought} />
                <svg viewBox="0 0 120 110" aria-hidden="true">
                  <path d="M20 104 C 14 70 34 44 60 44 C 86 44 106 70 100 104 Z" fill="var(--lavender)" stroke="var(--char-ink)" strokeWidth="2.5" />
                  <path d="M38 46 L 46 22 H 76 L 82 46 Z" fill="var(--char-ink)" />
                  <path d="M30 46 H 92" stroke="var(--char-ink)" strokeWidth="5" strokeLinecap="round" />
                  <circle cx="48" cy="72" r="4" fill="var(--char-ink)" />
                  <path d="M66 72 q 5 -4 10 0" fill="none" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M50 88 Q 60 94 70 88" fill="none" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            ) : slots.length ? (
              <button type="button" className={`paper-btn ${styles.clear}`} onClick={() => setSlice('secret', { slots: '' })}>
                Take the tokens back
              </button>
            ) : null}
          </div>

          {/* candle + invisible ink */}
          <div className={styles.candleWrap}>
            <button
              type="button"
              className={styles.candle}
              aria-pressed={secret.candleLit}
              aria-label={secret.candleLit ? 'Blow out the candle' : 'Light the candle'}
              onClick={(e) => {
                const lit = !secret.candleLit;
                setSlice('secret', { candleLit: lit });
                emitClick('candle', e);
                world.emit('OBJECT_STATE_CHANGED', { target: 'candle', key: 'lit', value: lit });
              }}
            >
              <svg viewBox="0 0 60 100" aria-hidden="true">
                <path className={styles.flame} d="M30 30 Q 18 18 30 2 Q 42 18 30 30" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2" />
                <rect x="20" y="32" width="20" height="58" rx="3" fill="#fffaf1" stroke="var(--char-ink)" strokeWidth="2.5" />
                <ellipse cx="30" cy="92" rx="22" ry="6" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2.5" />
              </svg>
            </button>
            <p className={styles.ink} aria-hidden={!secret.candleLit}>
              The house isn’t alive. <br />
              But it is paying attention.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TokenIcon({ id }: { id: string }) {
  const s = { stroke: 'var(--char-ink)', strokeWidth: 2.5 };
  if (id === 'moon') return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24 6 a 14 14 0 1 0 10 22 a 11 11 0 1 1 -10 -22 z" fill="var(--yellow)" {...s} /></svg>;
  if (id === 'leaf') return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 32 C 8 14 20 6 34 6 C 34 22 26 34 8 32 Z M8 32 L 26 14" fill="var(--mint)" {...s} /></svg>;
  return <svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="24" rx="14" ry="8" fill="var(--char-ink)" /><ellipse cx="20" cy="20" rx="14" ry="8" fill="var(--coral)" {...s} /></svg>;
}
