import { useCallback, useEffect, useRef, useState } from 'react';
import { pickLine } from '../../../behaviors/helpers';
import { ThoughtBubble } from '../../../characters/ThoughtBubble';
import { BUTTON_LINES, BUTTON_PLATE, BUTTON_PLATE_FRIENDLY, GLASS_LABEL, boltLabel } from '../../../content/button';
import type { World } from '../../../engine/world';
import { useObjects } from '../../../state/world';
import { TURNS, bracketsOut, glassClosed, type ButtonInput, type ButtonOutcome } from './buttonMachine';
import { useButton } from './buttonStore';
import styles from './Button.module.css';

/** An input without a timestamp (now is filled in). Distributes over the union. */
type Untimed<T> = T extends unknown ? Omit<T, 'now'> & { now?: number } : never;
export type ButtonApi = (input: Untimed<ButtonInput>) => ButtonOutcome;

interface Props {
  world: World;
  rootRef: React.RefObject<HTMLDivElement>;
  thought: string | null;
  /** The room gets a handle so characters (Dot, Tick) can act on the button too. */
  apiRef: React.MutableRefObject<ButtonApi | null>;
}

const INK = { stroke: 'var(--char-ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const };

/**
 * The button that fights back. A real button on a little table, with a face.
 * Press it gently and it's fine. Go at it and it gets wary, then builds a
 * glass box over itself (brackets, bolts, the lot). The glass is its own hit
 * target: presses land on the glass, not the button. Lift the glass when it
 * has calmed down, loosen the bolts, wait it out, or get Dot to help.
 */
export function ButtonActor({ world, rootRef, thought, apiRef }: Props) {
  const s = useButton((b) => b.s);
  const [act, setAct] = useState('');
  const [line, setLine] = useState<string | null>(null);
  const drag = useRef<{ y0: number; h: number } | null>(null);
  const glassRef = useRef<HTMLDivElement>(null);

  // clear, then set on the next frame, so the same act can play twice in a row
  const show = useCallback((name: string) => {
    setAct('');
    window.requestAnimationFrame(() => setAct(name));
  }, []);
  const say = useCallback(
    (outcome: ButtonOutcome) => {
      const lines = BUTTON_LINES[outcome];
      if (!lines) return;
      const text = pickLine('button', lines, world.rng);
      setLine(text);
      window.setTimeout(() => setLine((cur) => (cur === text ? null : cur)), 2000);
    },
    [world],
  );

  /** Act out what happened, and tell the house. */
  const perform: ButtonApi = useCallback(
    (input) => {
      const outcome = useButton.getState().dispatch({ ...input, now: input.now ?? Date.now() } as ButtonInput);
      const st = useButton.getState().s;
      useObjects.getState().setLiving({ buttonMode: st.mode });
      switch (outcome) {
        case 'pressed':
        case 'caught':
          useObjects.getState().setLiving((l) => ({ buttonPresses: l.buttonPresses + 1 }));
          world.emit('OBJECT_CLICKED', { target: 'button', repeat: useObjects.getState().living.buttonPresses, via: 'pointer' });
          world.effects.sound('press');
          show('press');
          break;
        case 'dodged':
          show('dodge');
          break;
        case 'blocked':
          world.effects.sound('pop');
          show('clink');
          break;
        case 'bracing':
          // that press landed; then it starts building
          useObjects.getState().setLiving((l) => ({ buttonPresses: l.buttonPresses + 1 }));
          world.emit('OBJECT_CLICKED', { target: 'button', repeat: useObjects.getState().living.buttonPresses, via: 'pointer' });
          world.effects.sound('shake');
          show('press');
          break;
        case 'shielded':
        case 'repaired':
          world.effects.sound('thud');
          break;
        case 'snapped':
          world.effects.sound('thud');
          show('slam');
          break;
        case 'opened':
        case 'lowered':
          world.effects.sound('chime');
          break;
        case 'loosened':
          world.effects.sound('press');
          break;
        case 'fell':
          world.effects.sound('thud');
          break;
        default:
          break;
      }
      if (outcome !== 'none' && outcome !== 'lifting') {
        world.emit('OBJECT_STATE_CHANGED', { target: 'button', key: outcome, value: st.mode });
        // one in two times it has something to say about it
        if (world.rng() < 0.5 || outcome === 'fell') say(outcome);
      }
      return outcome;
    },
    [say, show, world],
  );

  useEffect(() => {
    apiRef.current = perform;
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, perform]);

  // time passes: it builds, calms, repairs, lowers the glass
  useEffect(() => {
    const t = window.setInterval(() => {
      const b = useButton.getState().s;
      if (b.mode === 'calm' && b.irritation < 0.01) return;
      perform({ type: 'tick', idleMs: world.idleFor() });
    }, 250);
    return () => window.clearInterval(t);
  }, [perform, world]);

  // keep the house informed of the mode on the way in
  useEffect(() => {
    useObjects.getState().setLiving({ buttonMode: useButton.getState().s.mode });
  }, []);

  const closed = glassClosed(s);
  const friendly = s.trust >= 0.7 && s.mode === 'calm';
  const plate = friendly ? BUTTON_PLATE_FRIENDLY : BUTTON_PLATE[s.mode];
  const presses = useObjects((o) => o.living.buttonPresses);

  // ---- the glass, by hand
  const onGlassDown = (e: React.PointerEvent) => {
    if (s.mode !== 'shielded' || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { y0: e.clientY, h: glassRef.current?.offsetHeight || 60 };
  };
  const onGlassMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    perform({ type: 'lift', amount: Math.max(0, (d.y0 - e.clientY) / (d.h * 0.9)) });
  };
  const onGlassUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    // a tap (no lift) is a knock on the glass
    if (Math.abs(d.y0 - e.clientY) < 4) perform({ type: 'press', rng: world.rng() });
    else perform({ type: 'letGo' });
  };
  const onGlassKey = (e: React.KeyboardEvent) => {
    if (s.mode !== 'shielded') return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(1, useButton.getState().s.lift + 0.34);
      perform({ type: 'lift', amount: next });
      if (next >= 1) perform({ type: 'letGo' });
    } else if (e.key === 'ArrowDown' || e.key === 'Escape') {
      e.preventDefault();
      perform({ type: 'lift', amount: 0 });
      perform({ type: 'letGo' });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      perform({ type: 'press', rng: world.rng() });
    }
  };

  return (
    <div ref={rootRef} className={styles.root} data-mode={s.mode} data-act={act} data-friendly={friendly}>
      <ThoughtBubble text={line ?? thought} side="left" />
      <svg viewBox="0 0 120 150" className={styles.table} aria-hidden="true">
        <path d="M30 70 L 22 148 M90 70 L 98 148 M60 74 L 60 148" stroke="var(--char-ink)" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="60" cy="68" rx="52" ry="12" fill="var(--paper)" {...INK} />
      </svg>

      <div className={styles.mount}>
        <button
          type="button"
          className={styles.bigButton}
          aria-label={`${plate || 'the button, hiding'} (pressed ${presses} times)${closed ? '. It is behind glass.' : ''}`}
          aria-disabled={closed || undefined}
          onClick={() => perform({ type: 'press', rng: world.rng() })}
        >
          <span className={styles.cap} aria-hidden="true">
            <span className={styles.eye} />
            <span className={styles.eye} />
            <span className={styles.mouth} />
          </span>
        </button>

        {bracketsOut(s) ? (
          <>
            <span className={styles.bracket} data-side="left" aria-hidden="true" />
            <span className={styles.bracket} data-side="right" aria-hidden="true" />
          </>
        ) : null}

        {s.mode !== 'calm' && s.mode !== 'wary' ? (
          <div
            ref={glassRef}
            className={styles.glass}
            data-mode={s.mode}
            style={{ '--lift': s.mode === 'shielded' ? s.lift : 0 } as React.CSSProperties}
            role="slider"
            tabIndex={s.mode === 'shielded' ? 0 : -1}
            aria-label={GLASS_LABEL}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((s.mode === 'shielded' ? s.lift : s.mode === 'open' ? 1 : 0) * 100)}
            aria-hidden={s.mode === 'shielded' ? undefined : true}
            onPointerDown={onGlassDown}
            onPointerMove={onGlassMove}
            onPointerUp={onGlassUp}
            onPointerCancel={() => {
              drag.current = null;
              perform({ type: 'letGo' });
            }}
            onKeyDown={onGlassKey}
          >
            <span className={styles.shine} aria-hidden="true" />
          </div>
        ) : null}

        {s.mode === 'shielded'
          ? ([0, 1] as const).map((i) => (
              <button
                key={i}
                type="button"
                className={styles.bolt}
                data-side={i === 0 ? 'left' : 'right'}
                style={{ '--turn': `${(TURNS - s.bolts[i]) * 120}deg` } as React.CSSProperties}
                aria-label={boltLabel(i === 0 ? 'left' : 'right', s.bolts[i])}
                onClick={(e) => {
                  e.stopPropagation();
                  perform({ type: 'turnBolt', bolt: i });
                }}
              >
                <span aria-hidden="true" />
              </button>
            ))
          : null}
      </div>

      {plate ? (
        <span className={styles.plate} aria-hidden="true">
          {plate}
        </span>
      ) : null}
    </div>
  );
}
