import { useCallback, useEffect, useRef, useState } from 'react';
import { actors, type ActorCommand } from '../engine/actors';
import type { ActorAnim, ActorId, Expression } from '../engine/types';
import type { GazeControl } from './Eye';

const DEFAULT_ANIM_MS: Partial<Record<ActorAnim, number>> = {
  jump: 650,
  wiggle: 600,
  shake: 450,
  squish: 420,
  spin: 900,
  dizzy: 1600,
  tilt: 700,
  bounce: 800,
  peek: 1400,
  hide: 1600,
  wave: 900,
};

export interface CharacterHandle {
  expression: Expression;
  thought: string | null;
  rootRef: React.RefObject<HTMLDivElement>;
  gaze: React.MutableRefObject<GazeControl>;
  /** Locally trigger an expression (presentation-only feedback). */
  express: (e: Expression, ms?: number) => void;
  play: (anim: ActorAnim, ms?: number) => void;
}

/**
 * Subscribes a character to the actor channel. Expression overrides and
 * thoughts revert automatically; animations are set as a data attribute on
 * the root element imperatively (no re-render). All timers are cleared on
 * unmount.
 */
export function useCharacter(id: ActorId, baseExpression: Expression): CharacterHandle {
  const [override, setOverride] = useState<Expression | null>(null);
  const [thought, setThought] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const gaze = useRef<GazeControl>({ override: null, avert: false });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});

  const later = useCallback((key: string, ms: number, fn: () => void) => {
    const t = timers.current;
    if (t[key]) clearTimeout(t[key]);
    t[key] = setTimeout(() => {
      t[key] = undefined;
      fn();
    }, ms);
  }, []);

  const express = useCallback(
    (value: Expression, ms?: number) => {
      setOverride(value);
      if (ms !== undefined) later('expr', ms, () => setOverride(null));
    },
    [later],
  );

  const play = useCallback(
    (name: ActorAnim, ms?: number) => {
      const el = rootRef.current;
      if (!el) return;
      el.removeAttribute('data-anim');
      // force restart of the same animation
      void el.offsetWidth;
      el.setAttribute('data-anim', name);
      later('anim', ms ?? DEFAULT_ANIM_MS[name] ?? 700, () => el.removeAttribute('data-anim'));
    },
    [later],
  );

  useEffect(() => {
    const handle = (cmd: ActorCommand) => {
      switch (cmd.type) {
        case 'expression':
          express(cmd.value, cmd.durationMs);
          break;
        case 'anim':
          play(cmd.name, cmd.durationMs);
          break;
        case 'say':
          setThought(cmd.text);
          later('say', cmd.durationMs ?? 2600, () => setThought(null));
          break;
        case 'gaze':
          gaze.current.override = cmd.target;
          gaze.current.avert = cmd.avert ?? false;
          later('gaze', cmd.durationMs ?? 1500, () => {
            gaze.current.override = null;
            gaze.current.avert = false;
          });
          break;
        case 'reset':
          setOverride(null);
          setThought(null);
          gaze.current.override = null;
          gaze.current.avert = false;
          rootRef.current?.removeAttribute('data-anim');
          break;
      }
    };
    const unsub = actors.subscribe(id, handle);
    const t = timers.current;
    return () => {
      unsub();
      for (const key of Object.keys(t)) {
        if (t[key]) clearTimeout(t[key]);
        t[key] = undefined;
      }
    };
  }, [id, express, play, later]);

  return { expression: override ?? baseExpression, thought, rootRef, gaze, express, play };
}
