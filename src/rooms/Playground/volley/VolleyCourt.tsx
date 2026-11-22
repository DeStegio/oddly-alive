import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorld } from '../../../app/worldInstance';
import { useWeather } from '../../../components/useWeather';
import { VOLLEY } from '../../../content/volley';
import { onFrame } from '../../../engine/frameLoop';
import { useKeepsakes } from '../../../state/keepsakes';
import { isReducedMotion } from '../../../state/settings';
import {
  BIP_R,
  COURT,
  DOT_R,
  MATERIALS,
  bipCanHit,
  bipMove,
  bipPlan,
  dotCanHit,
  dotHit,
  initialBip,
  lobTo,
  serve,
  stepBall,
  type BallState,
  type MaterialId,
  type Side,
} from './model';
import styles from './Volley.module.css';

const SWING_S = 0.26;
const DOT_SPEED = 470;
const POINT_PAUSE = 1.3;

type Phase = 'ready' | 'rally' | 'point';

/**
 * Back-Fence Volley: you're Dot, on our side of the fence; Bip is on his.
 * Move with the pointer (or arrow keys, or a finger), swing with a click,
 * Space or a tap. When in the swing you meet the ball decides the shot.
 * Bip reads the ball, takes a beat, and goes for it, mostly.
 */
export function VolleyCourt({ onActive }: { onActive?: (on: boolean) => void }) {
  const world = useWorld();
  const weather = useWeather();
  const atticFound = useKeepsakes((k) => k.attic.unlocked);
  const best = useKeepsakes((k) => k.records['dot-rally'] ?? 0);
  const courtRef = useRef<HTMLDivElement>(null);
  const dotEl = useRef<HTMLDivElement>(null);
  const bipEl = useRef<HTMLDivElement>(null);
  const ballEl = useRef<HTMLDivElement>(null);
  const [material, setMaterial] = useState<MaterialId>('ball');
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState({ dot: 0, bip: 0 });
  const [rally, setRally] = useState(0);
  const [line, setLine] = useState<string>(VOLLEY.start);
  const g = useRef({
    phase: 'ready' as Phase,
    server: 'dot' as Side,
    ball: null as BallState | null,
    bip: initialBip(),
    dot: { x: 160, target: 160, jumpT: -1, swingT: -1, swung: false, keys: 0 },
    t: 0,
    pauseUntil: 0,
    planned: false,
    rally: 0,
    wind: 0,
    idle: 0,
    bipAct: '' as '' | 'hit' | 'dive' | 'cheer' | 'sulk',
    bipActUntil: 0,
  });
  const m = MATERIALS[material];
  const matRef = useRef(m);
  matRef.current = m;

  const say = useCallback((text: string) => setLine(text), []);

  /** End of a point: who lost it, and why. */
  const point = useCallback(
    (loser: Side, out: boolean) => {
      const s = g.current;
      s.phase = 'point';
      setPhase('point');
      s.pauseUntil = s.t + POINT_PAUSE;
      const winner: Side = loser === 'dot' ? 'bip' : 'dot';
      s.server = winner;
      setScore((sc) => ({ ...sc, [winner]: sc[winner] + 1 }));
      const r = s.rally;
      if (useKeepsakes.getState().record('dot-rally', r) && r >= 3) say(VOLLEY.best(r));
      else say(winner === 'dot' ? (out ? VOLLEY.bipOut : VOLLEY.dotPoint) : out ? VOLLEY.dotOut : VOLLEY.bipPoint);
      if (winner === 'bip') {
        s.bip = { ...s.bip, streak: s.bip.streak + 1 };
        s.bipAct = 'cheer';
      } else {
        s.bip = { ...s.bip, streak: 0 };
        s.bipAct = 'sulk';
        if (matRef.current.id === 'radish' || matRef.current.id === 'slipper') world.effects.discover('odd-ball');
      }
      s.bipActUntil = s.t + POINT_PAUSE;
      world.emit('OBJECT_STATE_CHANGED', { target: 'volley', key: 'point', value: `${winner}:${r}` });
      world.effects.sound(winner === 'dot' ? 'chime' : 'pop');
    },
    [say, world],
  );

  const swing = useCallback(() => {
    const s = g.current;
    s.idle = 0;
    if (s.phase === 'ready' && s.server === 'dot') {
      s.ball = serve('dot', matRef.current);
      s.phase = 'rally';
      s.planned = false;
      s.rally = 0;
      setRally(0);
      setPhase('rally');
      s.wind = weather === 'windy' ? (Math.random() < 0.5 ? -1 : 1) * 60 : 0;
      say(VOLLEY.served);
      world.effects.sound('press');
      return;
    }
    if (s.dot.swingT < 0) {
      s.dot.swingT = s.t;
      s.dot.jumpT = s.t;
      s.dot.swung = false;
    }
  }, [say, weather, world]);

  // the game loop: fixed little steps, positions written straight to the DOM
  useEffect(
    () =>
      onFrame((dtMs) => {
        const s = g.current;
        const mat = matRef.current;
        const dtAll = Math.min(0.05, dtMs / 1000);
        const steps = Math.max(1, Math.round(dtAll / (1 / 240)));
        const dt = dtAll / steps;
        for (let k = 0; k < steps; k++) {
          s.t += dt;
          s.idle += dt;
          // Dot moves towards where you want him
          if (s.dot.keys) s.dot.target = Math.max(DOT_R, Math.min(COURT.net - DOT_R - 4, s.dot.target + s.dot.keys * DOT_SPEED * dt));
          const d = s.dot.target - s.dot.x;
          s.dot.x += Math.sign(d) * Math.min(Math.abs(d), DOT_SPEED * dt);
          if (s.dot.swingT >= 0 && s.t - s.dot.swingT > SWING_S + 0.18) s.dot.swingT = -1;
          if (s.dot.jumpT >= 0 && s.t - s.dot.jumpT > 0.44) s.dot.jumpT = -1;

          if (s.phase === 'point' && s.t >= s.pauseUntil) {
            s.phase = 'ready';
            s.ball = null;
            setPhase('ready');
            setRally(0);
            s.rally = 0;
            if (s.server === 'bip') {
              s.pauseUntil = s.t + 0.9;
              say(VOLLEY.bipServes);
            } else say(VOLLEY.yourServe);
          }
          if (s.phase === 'ready' && s.server === 'bip' && s.t >= s.pauseUntil) {
            s.ball = serve('bip', mat);
            s.phase = 'rally';
            s.planned = false;
            setPhase('rally');
            s.bipAct = 'hit';
            s.bipActUntil = s.t + 0.3;
          }
          if (s.phase !== 'rally' || !s.ball) continue;

          const r = stepBall(s.ball, mat, dt, s.wind, s.t);
          s.ball = r.ball;
          if (r.landed) {
            point(r.landed.out ? (s.ball.last ?? r.landed.side) : r.landed.side, r.landed.out);
            continue;
          }
          const dotY = COURT.ground - jump(s.dot.jumpT, s.t);
          // Dot's swing meets the ball
          if (s.dot.swingT >= 0 && !s.dot.swung && s.t - s.dot.swingT <= SWING_S && dotCanHit({ x: s.dot.x, y: dotY }, s.ball, mat) && s.ball.last !== 'dot') {
            const timing = (s.t - s.dot.swingT) / SWING_S;
            s.ball = dotHit(s.ball, mat, { x: s.dot.x, y: dotY }, timing);
            s.dot.swung = true;
            s.planned = false;
            s.rally++;
            setRally(s.rally);
            if (s.rally === 10) world.effects.discover('back-fence');
            world.effects.sound('press');
          }
          // Bip reads it as soon as it's his
          if (s.ball.last === 'dot' && s.ball.vx > 0 && !s.planned) {
            s.bip = bipPlan(s.bip, s.ball, mat, s.t, Math.random, s.wind);
            s.planned = true;
            if (s.bip.diving) {
              s.bipAct = 'dive';
              s.bipActUntil = s.t + 0.8;
            }
          }
          s.bip = bipMove(s.bip, s.t, dt);
          if (s.ball.last === 'dot' && bipCanHit(s.bip, s.ball)) {
            const tx = 70 + Math.random() * 270;
            s.ball = lobTo(s.ball, mat, tx, 0.95 + Math.random() * 0.4, 'bip');
            s.bip = { ...s.bip, target: 640, moveAt: s.t + 0.3, diving: false };
            s.bipAct = 'hit';
            s.bipActUntil = s.t + 0.3;
            s.rally++;
            setRally(s.rally);
          }
        }
        // draw
        const court = courtRef.current;
        if (!court) return;
        const sc = court.clientWidth / COURT.w;
        const dotY = COURT.ground - jump(s.dot.jumpT, s.t);
        if (dotEl.current) dotEl.current.style.transform = `translate(${((s.dot.x - DOT_R) * sc).toFixed(1)}px, ${((dotY - DOT_R * 2) * sc).toFixed(1)}px)`;
        if (dotEl.current) dotEl.current.dataset.swing = String(s.dot.swingT >= 0 && s.t - s.dot.swingT <= SWING_S);
        // Bip practises on his own while he waits for you to serve
        const bipX = s.phase === 'ready' && s.server === 'dot' && s.idle > 8 ? 640 + Math.sin(s.t * 1.7) * 40 : s.bip.x;
        if (bipEl.current) {
          bipEl.current.style.transform = `translate(${((bipX - BIP_R) * sc).toFixed(1)}px, ${((COURT.ground - BIP_R * 2.6) * sc).toFixed(1)}px)`;
          bipEl.current.dataset.act = s.t < s.bipActUntil ? s.bipAct : s.phase === 'ready' && s.server === 'dot' && s.idle > 8 ? 'practice' : '';
        }
        const ball = ballEl.current;
        if (ball) {
          const b = s.ball ?? (s.phase === 'ready' ? { x: s.server === 'dot' ? s.dot.x + 6 : bipX - 6, y: (s.server === 'dot' ? dotY - DOT_R * 2.3 : COURT.ground - BIP_R * 3.1) - mat.r, angle: 0 } : null);
          ball.style.visibility = b ? 'visible' : 'hidden';
          if (b) ball.style.transform = `translate(${((b.x - mat.r) * sc).toFixed(1)}px, ${((b.y - mat.r) * sc).toFixed(1)}px) rotate(${(isReducedMotion() ? 0 : b.angle).toFixed(2)}rad)`;
        }
      }),
    [point, say],
  );

  // pointer: move along our side; a click or tap swings (or serves)
  const toCourt = (e: React.PointerEvent) => {
    const r = courtRef.current!.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * COURT.w;
  };
  const down = useRef<{ x: number; t: number } | null>(null);
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || down.current) g.current.dot.target = Math.max(DOT_R, Math.min(COURT.net - DOT_R - 4, toCourt(e)));
    g.current.idle = 0;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    courtRef.current?.focus();
    down.current = { x: e.clientX, t: e.timeStamp };
    if (e.pointerType !== 'mouse') g.current.dot.target = Math.max(DOT_R, Math.min(COURT.net - DOT_R - 4, toCourt(e)));
    swing();
  };
  const onPointerUp = () => {
    down.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const s = g.current;
    if (e.key === 'ArrowLeft' || e.key === 'a') s.dot.keys = -1;
    else if (e.key === 'ArrowRight' || e.key === 'd') s.dot.keys = 1;
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') swing();
    else return;
    e.preventDefault();
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    const s = g.current;
    if ((e.key === 'ArrowLeft' || e.key === 'a') && s.dot.keys < 0) s.dot.keys = 0;
    if ((e.key === 'ArrowRight' || e.key === 'd') && s.dot.keys > 0) s.dot.keys = 0;
  };

  // swapping the ball mid-point would be cheating: only between points
  const choose = (id: MaterialId) => {
    if (g.current.phase === 'rally') return;
    setMaterial(id);
    say(VOLLEY.swapped(MATERIALS[id].label));
  };

  return (
    <section className={styles.section} aria-labelledby="volley-title">
      <div className={styles.head}>
        <h2 id="volley-title" className={styles.title}>
          {VOLLEY.title}
        </h2>
        <p className={styles.score} aria-live="polite">
          <span>
            Dot <b>{score.dot}</b>
          </span>
          <span>
            Bip <b>{score.bip}</b>
          </span>
          <span className={styles.rally}>{VOLLEY.rally(rally)}</span>
          {best ? <span className={styles.best}>{VOLLEY.bestSoFar(best)}</span> : null}
        </p>
      </div>
      <div
        ref={courtRef}
        className={styles.court}
        data-phase={phase}
        tabIndex={0}
        role="group"
        aria-label={VOLLEY.courtLabel}
        aria-describedby="volley-line"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={() => onActive?.(true)}
        onPointerLeave={() => onActive?.(false)}
        onFocus={() => onActive?.(true)}
        onBlur={() => onActive?.(false)}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.lawn} aria-hidden="true" />
        <div className={styles.fence} aria-hidden="true" />
        <div ref={dotEl} className={styles.dot} aria-hidden="true">
          <svg viewBox="0 0 60 60">
            <ellipse cx="30" cy="57" rx="14" ry="2.5" fill="var(--shadow-ink)" opacity="0.2" />
            <circle cx="30" cy="31" r="22" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="3" />
            <circle cx="37" cy="27" r="8" fill="#fffaf1" stroke="var(--char-ink)" strokeWidth="2" />
            <circle cx="40" cy="27" r="3.5" fill="var(--char-ink)" />
            <path d="M24 9 Q 22 2 27 1" fill="none" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <div ref={bipEl} className={styles.bip} aria-hidden="true">
          <svg viewBox="0 0 80 96">
            <path d="M40 6 V 18" stroke="var(--char-ink)" strokeWidth="3" />
            <circle cx="40" cy="6" r="4.5" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="2.5" />
            <g className={styles.arms}>
              <path d="M14 56 C 4 52 2 42 4 34" fill="none" stroke="var(--char-ink)" strokeWidth="4" strokeLinecap="round" />
              <path d="M66 56 C 76 52 78 42 76 34" fill="none" stroke="var(--char-ink)" strokeWidth="4" strokeLinecap="round" />
            </g>
            <rect x="14" y="18" width="52" height="34" rx="10" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="3" />
            <rect x="20" y="24" width="40" height="22" rx="7" fill="#24232b" />
            <rect className={styles.bipEye} x="27" y="29" width="6" height="9" rx="3" fill="#a6f0c6" />
            <rect className={styles.bipEye} x="47" y="29" width="6" height="9" rx="3" fill="#a6f0c6" />
            <rect x="18" y="52" width="44" height="36" rx="10" fill="var(--mint)" stroke="var(--char-ink)" strokeWidth="3" />
            <path d="M28 88 v 6 M52 88 v 6" stroke="var(--char-ink)" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <div ref={ballEl} className={styles.ball} data-material={material} style={{ width: `${(m.r * 2 * 100) / COURT.w}%` }} aria-hidden="true">
          <BallArt id={material} />
        </div>
        {phase === 'ready' && g.current.server === 'dot' ? <span className={styles.hint} aria-hidden="true">{VOLLEY.tapToServe}</span> : null}
      </div>
      <p id="volley-line" className={styles.line} aria-live="polite">
        {line}
      </p>
      <div className={styles.materials} role="group" aria-label={VOLLEY.materialsLabel}>
        {(Object.keys(MATERIALS) as MaterialId[])
          .filter((id) => id !== 'slipper' || atticFound)
          .map((id) => (
            <button key={id} type="button" className={styles.material} aria-pressed={material === id} disabled={phase === 'rally'} onClick={() => choose(id)}>
              <span className={styles.matIcon} aria-hidden="true">
                <BallArt id={id} />
              </span>
              {VOLLEY.materialName[id]}
            </button>
          ))}
      </div>
    </section>
  );
}

/** Dot's little hop when he swings. */
const jump = (t0: number, t: number) => (t0 < 0 ? 0 : Math.max(0, Math.sin(Math.min(1, (t - t0) / 0.44) * Math.PI) * 46));

const K = 'var(--char-ink)';
function BallArt({ id }: { id: MaterialId }) {
  switch (id) {
    case 'balloon':
      return (
        <svg viewBox="0 0 40 52">
          <ellipse cx="20" cy="20" rx="17" ry="19" fill="var(--coral)" stroke={K} strokeWidth="2.5" />
          <path d="M20 39 l -3 4 h 6 Z M20 43 q 4 4 0 9" fill="none" stroke={K} strokeWidth="2" />
          <ellipse cx="13" cy="13" rx="4" ry="6" fill="#fffaf1" opacity="0.6" />
        </svg>
      );
    case 'radish':
      return (
        <svg viewBox="0 0 40 48">
          <path d="M20 14 q -8 -10 -14 -8 M20 14 q 1 -12 9 -12" fill="none" stroke="#3f7a52" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M20 14 C 36 16 36 36 20 46 C 4 36 4 16 20 14 Z" fill="var(--coral)" stroke={K} strokeWidth="2.5" />
        </svg>
      );
    case 'cube':
      return (
        <svg viewBox="0 0 40 40">
          <rect x="4" y="4" width="32" height="32" rx="9" fill="var(--mint)" stroke={K} strokeWidth="2.5" />
          <path d="M12 14 h 4 M24 14 h 4 M15 25 q 5 4 10 0" fill="none" stroke={K} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'slipper':
      return (
        <svg viewBox="0 0 48 30">
          <path d="M4 20 C 4 10 14 6 24 8 L 36 12 C 44 14 46 18 44 22 C 40 26 10 26 4 20 Z" fill="var(--lavender)" stroke={K} strokeWidth="2.5" />
          <path d="M18 9 C 22 16 32 16 36 12" fill="none" stroke={K} strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" fill="var(--yellow)" stroke={K} strokeWidth="2.5" />
          <path d="M5 16 Q 20 26 35 16 M20 3 Q 12 20 20 37" fill="none" stroke={K} strokeWidth="2" />
        </svg>
      );
  }
}
