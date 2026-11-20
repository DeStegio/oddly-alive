import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { WeatherLayer } from '../../components/WeatherLayer';
import { onFrame } from '../../engine/frameLoop';
import { SHAPES, type ShapeKind } from './physics';
import { ShapeView } from './ShapeView';
import styles from './NextDoor.module.css';

/** Where Bip is right now, in viewport pixels. */
export interface BipBox {
  x: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface NextDoorHandle {
  /** The yard element (the Playground sizes it to match the tray). */
  root(): HTMLElement | null;
  bip(): BipBox | null;
  /** Roll towards this viewport x (null: back home). */
  moveTo(clientX: number | null): void;
  /** Bip hits the ball back. */
  volley(rally: number): void;
  /** Show (or stop showing) something held overhead. */
  hold(kind: ShapeKind | null): void;
  say(text: string, ms?: number): void;
  setMood(mood: Mood): void;
}

type Mood = 'idle' | 'ready' | 'happy' | 'worried';

interface Props {
  rally: number;
  best: number;
  onPoke?: () => void;
}

/** Bip rolls across the whole yard in about this long (ms). */
const CROSS_MS = 650;
const HOME = 0.62;

const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)]!;

/**
 * Bip's yard, next door to the Playground: the same size as the tray, with a
 * volleyball-playing robot in it. Anything thrown hard enough to the right
 * flies over here; Bip rolls to where it will come down and volleys it back.
 * The ball flights themselves live in the Playground; this is Bip's half.
 */
export const NextDoor = forwardRef<NextDoorHandle, Props>(function NextDoor({ rally, best, onPoke }, ref) {
  const rootRef = useRef<HTMLElement>(null);
  const bipRef = useRef<HTMLDivElement>(null);
  const pos = useRef(HOME); // fraction of the yard width (Bip's centre)
  const target = useRef(HOME);
  const [mood, setMood] = useState<Mood>('idle');
  const [anim, setAnim] = useState<'' | 'volley'>('');
  const [held, setHeld] = useState<ShapeKind | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const timers = useRef(new Set<number>());

  const later = useCallback((ms: number, fn: () => void) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const t of all) window.clearTimeout(t);
      all.clear();
    };
  }, []);

  const say = useCallback(
    (text: string, ms = 1600) => {
      setLine(text);
      later(ms, () => setLine((cur) => (cur === text ? null : cur)));
    },
    [later],
  );

  // roll along the floor towards the target
  useEffect(
    () =>
      onFrame((dt) => {
        const el = bipRef.current;
        if (!el) return;
        const d = target.current - pos.current;
        if (Math.abs(d) > 0.002) {
          const step = Math.sign(d) * Math.min(Math.abs(d), dt / CROSS_MS);
          pos.current += step;
          el.dataset.dir = d > 0 ? 'right' : 'left';
          el.dataset.rolling = 'true';
        } else if (el.dataset.rolling === 'true') {
          el.dataset.rolling = 'false';
        }
        el.style.left = `${(pos.current * 100).toFixed(2)}%`;
      }),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      root: () => rootRef.current,
      bip() {
        const el = bipRef.current;
        const yard = rootRef.current;
        if (!el || !yard) return null;
        const r = el.getBoundingClientRect();
        const y = yard.getBoundingClientRect();
        // use the model position (not the rendered one) so plans don't lag a frame
        return { x: y.left + yard.clientLeft + pos.current * yard.clientWidth, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      },
      moveTo(clientX) {
        const yard = rootRef.current;
        if (clientX === null || !yard) {
          target.current = HOME;
          return;
        }
        const y = yard.getBoundingClientRect();
        const f = (clientX - y.left - yard.clientLeft) / yard.clientWidth;
        target.current = Math.min(0.92, Math.max(0.08, f));
      },
      volley(n) {
        setMood('happy');
        setAnim('volley');
        later(320, () => setAnim(''));
        say(n === 1 ? pick(['bump!', 'back at you!', 'volley!']) : n % 5 === 0 ? `${n}! we’re unstoppable.` : `${n}!`, 1200);
        later(900, () => setMood((m) => (m === 'happy' ? 'idle' : m)));
      },
      hold: setHeld,
      say,
      setMood,
    }),
    [later, say],
  );

  const poke = () => {
    onPoke?.();
    if (held) return; // the Playground decides when there's room again
    setMood('happy');
    say(pick(['beep. I’m Bip. I play volleyball.', 'throw it hard, to the right. I’ll send it back.', 'don’t let it touch your floor!', 'ready when you are.']), 2400);
    later(1200, () => setMood((m) => (m === 'happy' ? 'idle' : m)));
  };

  return (
    <section ref={rootRef} className={styles.yard} aria-labelledby="pg-nextdoor-title">
      <h2 id="pg-nextdoor-title" className={styles.label}>
        next door
      </h2>
      <p className={styles.score} aria-live="polite">
        rally <strong>{rally}</strong>
        <span aria-hidden="true"> · </span>
        best <strong>{best}</strong>
      </p>
      <WeatherLayer variant="ambient" />
      <span className={styles.fence} aria-hidden="true" />

      <div ref={bipRef} className={styles.bip} data-mood={mood} data-anim={anim} data-holding={held !== null} data-dir="left">
        <ThoughtBubble text={line} side="left" className={styles.bubble} />
        {held ? (
          <div className={styles.held} style={{ width: `calc(${SHAPES[held].w}px * var(--s, 1))`, height: `calc(${SHAPES[held].h}px * var(--s, 1))` }} aria-hidden="true">
            <ShapeView kind={held} />
          </div>
        ) : null}
        <button type="button" className={`prop-btn ${styles.hit}`} onClick={poke} aria-label={held ? 'Bip, the robot next door, holding something of yours' : 'Bip, the volleyball robot next door'}>
          <BipSvg />
        </button>
      </div>
    </section>
  );
});

function BipSvg() {
  const ink = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 110 132" className={styles.svg} aria-hidden="true">
      {/* antenna */}
      <path d="M55 8 V 22" fill="none" {...ink} />
      <circle className={styles.bulb} cx="55" cy="8" r="5" {...ink} />
      {/* arms: up when ready, a quick swing on the volley */}
      <g className={styles.arms}>
        <path className={styles.armL} d="M22 78 C 10 74 6 62 8 52" fill="none" {...ink} strokeWidth={5} />
        <path className={styles.armR} d="M88 78 C 100 74 104 62 102 52" fill="none" {...ink} strokeWidth={5} />
      </g>
      {/* body */}
      <rect x="24" y="64" width="62" height="50" rx="12" fill="var(--mint)" {...ink} />
      <rect x="40" y="78" width="30" height="8" rx="4" fill="var(--cut-paper)" {...ink} strokeWidth={2} />
      <circle cx="46" cy="99" r="3.5" fill="var(--coral)" />
      <circle cx="64" cy="99" r="3.5" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth={1.5} />
      {/* wheels */}
      <g className={styles.wheel}>
        <circle cx="38" cy="118" r="9" fill="var(--lavender)" {...ink} />
        <path d="M38 111 V 125" fill="none" {...ink} strokeWidth={1.5} />
      </g>
      <g className={styles.wheel}>
        <circle cx="72" cy="118" r="9" fill="var(--lavender)" {...ink} />
        <path d="M72 111 V 125" fill="none" {...ink} strokeWidth={1.5} />
      </g>
      {/* head */}
      <rect x="18" y="22" width="74" height="46" rx="14" fill="var(--blue)" {...ink} />
      <rect x="27" y="30" width="56" height="30" rx="9" fill="#24232b" stroke="none" />
      {/* screen faces, switched by data-mood */}
      <g className={styles.faceIdle} fill="#a6f0c6">
        <rect x="38" y="38" width="7" height="10" rx="3.5" />
        <rect x="65" y="38" width="7" height="10" rx="3.5" />
        <path d="M49 52 q 6 4 12 0" fill="none" stroke="#a6f0c6" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g className={styles.faceReady} fill="#a6f0c6">
        <circle cx="41" cy="40" r="4.5" />
        <circle cx="69" cy="40" r="4.5" />
        <path d="M48 52 h 14" fill="none" stroke="#a6f0c6" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g className={styles.faceHappy} fill="none" stroke="#a6f0c6" strokeWidth="2.6" strokeLinecap="round">
        <path d="M36 44 q 5 -6 10 0" />
        <path d="M64 44 q 5 -6 10 0" />
        <path d="M47 50 q 8 7 16 0" />
      </g>
      <g className={styles.faceWorried} fill="none" stroke="#a6f0c6" strokeWidth="2.4" strokeLinecap="round">
        <path d="M36 38 l 9 3" />
        <path d="M74 38 l -9 3" />
        <circle cx="41" cy="45" r="2.5" fill="#a6f0c6" />
        <circle cx="69" cy="45" r="2.5" fill="#a6f0c6" />
        <path d="M48 54 q 7 -4 14 0" />
      </g>
    </svg>
  );
}
