import { useEffect, useRef } from 'react';
import { actors } from '../engine/actors';
import type { ActorId } from '../engine/types';
import { onFrame } from '../engine/frameLoop';
import { layoutEpoch, pointer } from '../engine/pointer';
import { isReducedMotion } from '../state/settings';
import styles from './LivingTitle.module.css';

interface Props {
  lines: string[];
  /** Accessible heading text. */
  label: string;
  id?: string;
  size?: 'hero' | 'room';
  /** Letters dodge the pointer within this radius (px). */
  radius?: number;
  className?: string;
  /** Called once when a letter is "pushed" hard by a fast pointer. */
  onShove?: () => void;
  /** Listen to actor commands (poke a letter, go wonky). */
  actorId?: ActorId;
}

interface LetterState {
  el: HTMLSpanElement;
  bx: number;
  by: number;
  x: number;
  y: number;
  r: number;
}

/**
 * Display type that is a character: each letter leans away from the pointer
 * and springs back. Transforms only (no layout); base positions are measured
 * with transforms cleared and refreshed when layout may have changed.
 */
export function LivingTitle({
  lines,
  label,
  id,
  size = 'hero',
  radius = 170,
  className,
  onShove,
  actorId,
}: Props) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const shove = useRef(onShove);
  shove.current = onShove;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const letters: LetterState[] = Array.from(
      root.querySelectorAll<HTMLSpanElement>('[data-letter]'),
    ).map((el) => ({
      el,
      bx: 0,
      by: 0,
      x: 0,
      y: 0,
      r: 0,
    }));
    let measuredEpoch = -1;
    let rootRect: DOMRect | null = null;
    let lastShove = 0;
    let resting = false;
    const measure = () => {
      for (const l of letters) l.el.style.transform = '';
      rootRect = root.getBoundingClientRect();
      for (const l of letters) {
        const r = l.el.getBoundingClientRect();
        l.bx = r.left - rootRect.left + r.width / 2;
        l.by = r.top - rootRect.top + r.height / 2;
      }
      measuredEpoch = layoutEpoch();
    };
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => (measuredEpoch = -1)) : null;
    ro?.observe(root);
    // fonts load late and change metrics
    void document.fonts?.ready.then(() => (measuredEpoch = -1));

    const unsub = onFrame((_dt, now) => {
      if (isReducedMotion()) return;
      if (measuredEpoch !== layoutEpoch()) {
        if (measuredEpoch === -1 || !rootRect) measure();
        else {
          rootRect = root.getBoundingClientRect();
          measuredEpoch = layoutEpoch();
        }
      }
      if (!rootRect) return;
      const px = pointer.x - rootRect.left;
      const py = pointer.y - rootRect.top;
      const live = pointer.active && pointer.inside && now - pointer.lastMove < 2500;
      // every letter at rest and no pointer nearby: nothing to do this frame
      if (!live && resting) return;
      let allRest = true;
      for (const l of letters) {
        let tx = 0;
        let ty = 0;
        let tr = 0;
        if (live) {
          const dx = l.bx - px;
          const dy = l.by - py;
          const d = Math.hypot(dx, dy);
          if (d < radius) {
            const f = 1 - d / radius;
            const push = f * f * (size === 'hero' ? 26 : 16);
            tx = (dx / (d || 1)) * push;
            ty = (dy / (d || 1)) * push;
            tr = (dx > 0 ? 1 : -1) * f * 9;
            if (f > 0.75 && pointer.speed > 2.5 && now - lastShove > 4000) {
              lastShove = now;
              shove.current?.();
            }
          }
        }
        l.x += (tx - l.x) * 0.16;
        l.y += (ty - l.y) * 0.16;
        l.r += (tr - l.r) * 0.16;
        if (Math.abs(l.x) + Math.abs(l.y) + Math.abs(l.r) < 0.05 && tx === 0) {
          if (l.el.style.transform) l.el.style.transform = '';
          continue;
        }
        allRest = false;
        l.el.style.transform = `translate(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px) rotate(${l.r.toFixed(2)}deg)`;
      }
      resting = allRest && !live;
    });
    return () => {
      unsub();
      ro?.disconnect();
      for (const l of letters) l.el.style.transform = '';
    };
  }, [radius, size]);

  useEffect(() => {
    if (!actorId) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const unsub = actors.subscribe(actorId, (cmd) => {
      const root = rootRef.current;
      if (!root) return;
      if (cmd.type === 'poke') {
        if (cmd.key === 'WONK') root.dataset.wonk = 'true';
        else if (cmd.key === 'UNWONK') delete root.dataset.wonk;
        else {
          root.querySelectorAll<HTMLSpanElement>('[data-letter]').forEach((el) => {
            if (el.textContent?.toLowerCase() !== cmd.key) return;
            el.removeAttribute('data-poke');
            void el.offsetWidth;
            el.setAttribute('data-poke', '');
            const t = setTimeout(() => {
              el.removeAttribute('data-poke');
              timers.delete(t);
            }, 650);
            timers.add(t);
          });
        }
      } else if (cmd.type === 'reset') {
        delete root.dataset.wonk;
      }
    });
    return () => {
      unsub();
      for (const t of timers) clearTimeout(t);
    };
  }, [actorId]);

  return (
    <h1
      ref={rootRef}
      id={id}
      className={`${styles.title} ${styles[size]} ${className ?? ''}`}
      aria-label={label}
    >
      {lines.map((line, li) => (
        <span key={li} className={styles.line} aria-hidden="true">
          {Array.from(line).map((ch, ci) => (
            <span key={ci} data-letter className={styles.letter}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
