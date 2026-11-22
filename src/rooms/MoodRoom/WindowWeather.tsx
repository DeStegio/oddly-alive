import { useEffect, useRef, useState } from 'react';
import { MOOD_FX } from '../../content/moodFx';
import { createPortal } from 'react-dom';
import type { Weather as HouseWeather } from '../../engine/weather';
import type { World } from '../../engine/world';
import { onFrame } from '../../engine/frameLoop';
import styles from './WindowWeather.module.css';

const STEAMY = new Set<HouseWeather>(['rain', 'storm', 'fog', 'snow']);
const SCRAPS = 7;

/** When each thing on the sill (and Nimbus) was last used. */
function useRecentUses(world: World) {
  const [uses, setUses] = useState<Record<string, number>>({});
  const [, tick] = useState(0);
  useEffect(() => {
    const off = world.bus.on('OBJECT_STATE_CHANGED', (ev) => {
      const p = ev.payload as { target?: string; key?: string };
      if (p.key === 'use' && p.target?.startsWith('mood:')) setUses((u) => ({ ...u, [p.target!.slice(5)]: Date.now() }));
    });
    // things wear off: look again every second
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      off();
      window.clearInterval(t);
    };
  }, [world]);
  return (id: string, ms: number) => (uses[id] ? Date.now() - uses[id]! < ms : false);
}

/**
 * Weather with consequences, on the Mood Room window. Rain (or fog, or
 * snow) and a cup of tea steam the glass up, and you can draw in it. Wind
 * takes the paper off the sill. Snow and the blanket make a tent for Nimbus.
 * A rainbow and the mirror throw colour round the room. Nimbus sometimes
 * starts these himself.
 */
export function WindowWeather({ world, weather, roomRef }: { world: World; weather: HouseWeather; roomRef: React.RefObject<HTMLElement> }) {
  const recent = useRecentUses(world);
  const steam = (STEAMY.has(weather) && recent('tea', 90_000)) || recent('breath', 30_000);
  const scraps = weather === 'windy' && (recent('letter', 60_000) || recent('gust', 25_000));
  const tent = weather === 'snow' && recent('blanket', 120_000);
  const spots = weather === 'rainbow' && recent('mirror', 60_000);

  // ---- steam you can draw in
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawn = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !steam) return;
    const ctx = c.getContext?.('2d');
    if (!ctx) return;
    const fit = () => {
      c.width = c.clientWidth;
      c.height = c.clientHeight;
      ctx.fillStyle = 'rgba(205, 214, 226, 0.9)';
      ctx.fillRect(0, 0, c.width, c.height);
    };
    fit();
    // the glass slowly mists over again
    const t = window.setInterval(() => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(205, 214, 226, 0.035)';
      ctx.fillRect(0, 0, c.width, c.height);
    }, 400);
    return () => window.clearInterval(t);
  }, [steam]);

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    const ctx = c?.getContext?.('2d');
    if (!c || !ctx || !(e.buttons || e.pointerType !== 'mouse')) return;
    const r = c.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    const from = last.current ?? p;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    drawn.current += Math.hypot(p.x - from.x, p.y - from.y);
    last.current = p;
    if (drawn.current > 900) {
      drawn.current = -Infinity;
      world.effects.discover('window-drawing');
      world.emit('OBJECT_STATE_CHANGED', { target: 'mood:window', key: 'drawn', value: true });
    }
  };

  // ---- paper scraps on the wind
  const [caught, setCaught] = useState<number[]>([]);
  useEffect(() => {
    if (!scraps) setCaught([]);
  }, [scraps]);
  const catchScrap = (i: number) => {
    setCaught((c) => {
      const next = c.includes(i) ? c : [...c, i];
      if (next.length === 5) world.effects.discover('paper-chase');
      return next;
    });
    world.effects.sound('pop');
  };

  // ---- rainbow light thrown about by the mirror
  const spotEls = useRef<Array<HTMLSpanElement | null>>([]);
  const hand = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!spots) return;
    const room = roomRef.current;
    if (!room) return;
    const onMove = (e: PointerEvent) => {
      const r = room.getBoundingClientRect();
      hand.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    room.addEventListener('pointermove', onMove);
    const pos = [0, 1, 2].map(() => ({ x: room.clientWidth / 2, y: room.clientHeight / 3 }));
    const off = onFrame((dt) => {
      pos.forEach((p, i) => {
        const k = 1 - Math.exp(-dt / (140 + i * 90));
        const tx = room.clientWidth - hand.current.x + (i - 1) * 60;
        const ty = hand.current.y * 0.6 + 40 + i * 30;
        p.x += (tx - p.x) * k;
        p.y += (ty - p.y) * k;
        const el = spotEls.current[i];
        if (el) el.style.transform = `translate(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px)`;
      });
    });
    return () => {
      room.removeEventListener('pointermove', onMove);
      off();
    };
  }, [roomRef, spots]);

  useEffect(() => {
    if (tent) world.effects.discover('snowed-in');
  }, [tent, world]);

  return (
    <>
      {steam ? (
        <canvas
          ref={canvasRef}
          className={styles.steam}
          aria-label={MOOD_FX.steam}
          role="img"
          onPointerDown={(e) => {
            last.current = null;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            draw(e);
          }}
          onPointerMove={draw}
          onPointerUp={() => (last.current = null)}
        />
      ) : null}
      {scraps
        ? Array.from({ length: SCRAPS }, (_, i) =>
            caught.includes(i) ? null : (
              <button
                key={i}
                type="button"
                className={styles.scrap}
                style={{ top: `${12 + ((i * 37) % 64)}%`, animationDelay: `${-i * 0.9}s`, animationDuration: `${5 + (i % 3)}s` }}
                aria-label={MOOD_FX.scrap}
                onClick={() => catchScrap(i)}
              />
            ),
          )
        : null}
      {tent ? (
        <svg className={styles.tent} viewBox="0 0 200 120" aria-label={MOOD_FX.tent} role="img">
          <path d="M10 118 L 100 8 L 190 118 Z" fill="var(--lavender)" stroke="var(--char-ink)" strokeWidth="4" strokeLinejoin="round" />
          <path d="M100 8 L 100 118 M60 60 H 140" stroke="var(--char-ink)" strokeWidth="2.5" opacity="0.5" />
          <path d="M80 118 L 100 70 L 120 118 Z" fill="#2a2840" stroke="var(--char-ink)" strokeWidth="3" />
        </svg>
      ) : null}
      {spots && roomRef.current
        ? createPortal([0, 1, 2].map((i) => (
            <span
              key={i}
              className={styles.spot}
              data-i={i}
              aria-hidden="true"
              ref={(el) => {
                spotEls.current[i] = el;
              }}
            />
          )), roomRef.current)
        : null}
    </>
  );
}
