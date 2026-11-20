import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../../app/worldInstance';
import { onFrame } from '../../engine/frameLoop';
import { WALTZ, angleDelta, beatMs, nextNote, playSpeed, windDown } from './spin';
import styles from './Attic.module.css';

const NOTES_SHOWN = 6;
const PROPER = (2 * Math.PI) / 1800;

/**
 * The gramophone only plays while the record turns, and you turn it: drag
 * round in a circle. Speed sets the tempo, backwards plays it backwards, and
 * a record left alone winds down. `onTempo` lets the room sway in time.
 */
export function Gramophone({ onTempo }: { onTempo: (speed: number) => void }) {
  const world = useWorld();
  const recordRef = useRef<HTMLDivElement>(null);
  const noteEls = useRef<Array<HTMLSpanElement | null>>([]);
  const spin = useRef({ angle: 0, vel: 0, held: false, last: 0, lastT: 0, beatIn: 0, index: 0, backwards: 0, notes: 0 });
  const nextNoteEl = useRef(0);
  const [playing, setPlaying] = useState(false);

  useEffect(
    () =>
      onFrame((dt) => {
        const s = spin.current;
        if (!s.held) s.vel = windDown(s.vel, dt);
        s.angle += s.vel * dt;
        if (recordRef.current) recordRef.current.style.transform = `rotate(${s.angle.toFixed(3)}rad)`;
        const speed = playSpeed(s.vel);
        const beat = beatMs(speed);
        onTempo(beat ? speed : 0);
        if (!beat) {
          s.beatIn = 0;
          if (playing) setPlaying(false);
          return;
        }
        if (!playing) setPlaying(true);
        s.beatIn -= dt;
        if (s.beatIn > 0) return;
        s.beatIn = beat;
        world.effects.sound(`note:${WALTZ[s.index]}`);
        s.index = nextNote(s.index, speed);
        s.notes++;
        s.backwards = speed < 0 ? s.backwards + 1 : 0;
        if (s.notes === 4) world.effects.discover('needle-drop');
        if (s.backwards === 6) world.effects.discover('scratch');
        // a little note floats up
        const el = noteEls.current[nextNoteEl.current++ % NOTES_SHOWN];
        if (el) {
          el.textContent = speed < 0 ? '♫' : '♪';
          el.classList.remove(styles.noteUp ?? 'noteUp');
          void el.offsetWidth;
          el.classList.add(styles.noteUp ?? 'noteUp');
        }
      }),
    [onTempo, playing, world],
  );

  const angleAt = (e: React.PointerEvent) => {
    const r = recordRef.current!.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const s = spin.current;
    s.held = true;
    s.last = angleAt(e);
    s.lastT = e.timeStamp;
  };
  const onMove = (e: React.PointerEvent) => {
    const s = spin.current;
    if (!s.held) return;
    const a = angleAt(e);
    const d = angleDelta(s.last, a);
    const dt = Math.max(1, e.timeStamp - s.lastT);
    s.vel = s.vel * 0.5 + (d / dt) * 0.5;
    s.angle += d;
    s.last = a;
    s.lastT = e.timeStamp;
  };
  const onUp = () => {
    spin.current.held = false;
  };

  return (
    <section className={styles.gramophone} aria-labelledby="gram-title">
      <h2 id="gram-title" className={styles.thingTitle}>
        Gramophone
      </h2>
      <div className={styles.gramStage}>
        <svg viewBox="0 0 160 90" className={styles.gramBody} aria-hidden="true">
          <rect x="16" y="52" width="104" height="34" rx="5" fill="#8a5a3c" stroke="var(--char-ink)" strokeWidth="2.5" />
          <path d="M104 50 L 122 22" stroke="var(--char-ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M120 24 C 126 4 150 -2 158 2 C 156 16 146 34 124 30 Z" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        <div
          ref={recordRef}
          className={styles.record}
          data-playing={playing}
          role="img"
          aria-label={playing ? 'The record, turning' : 'A record on the gramophone. Turn it by hand.'}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className={styles.recordLabel} />
        </div>
        {Array.from({ length: NOTES_SHOWN }, (_, i) => (
          <span
            key={i}
            className={styles.floatNote}
            aria-hidden="true"
            ref={(el) => {
              noteEls.current[i] = el;
            }}
          />
        ))}
      </div>
      <p className={styles.small}>Turn the record round with your hand. Faster is faster. The other way is the other way. (Sound is off until you switch it on, top right.)</p>
      <button type="button" className={styles.keyOnly} onClick={() => (spin.current.vel = PROPER)}>
        Give the record a spin
      </button>
    </section>
  );
}
