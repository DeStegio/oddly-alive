import { useEffect, useRef } from 'react';
import { Particles } from '../../art/particles';
import { onFrame } from '../../engine/frameLoop';
import { H, W, columnCloud, groundTop, idx, isAir, rainbows, type Valley } from './sim/valley';

interface Props {
  /** Read the latest valley without re-rendering React. */
  valleyRef: React.MutableRefObject<Valley>;
  reduced: boolean;
}

const RAINBOW = ['#f26b5b', '#f5a35b', '#f5d873', '#8fcf9a', '#6f8ff0', '#a98ad8'];

/**
 * Draws the fields of the valley (Phase 4): soft cloud blobs from the cloud
 * field, rain and snow from the shared particle helper, a fog band on the
 * low ground, rainbows where the geometry and the rain say, and lightning.
 * Canvas for the fields, the scenery is SVG on top. It reads the valley from
 * a ref on the shared frame loop, so nothing re-renders per frame.
 */
export function ValleyCanvas({ valleyRef, reduced }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) return;
    const parts = new Particles(reduced ? 60 : 160);
    let flash: { x: number; age: number } | null = null;
    let lastStrikes = valleyRef.current.strikes.length;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return onFrame((dt) => {
      const v = valleyRef.current;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.max(1, Math.round(r.width * dpr));
      const ch = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      const cx = cw / W;
      const cy = ch / H;
      ctx.clearRect(0, 0, cw, ch);

      // warmth and cold, a faint wash over the air
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!isAir(x, y)) continue;
          const T = v.temp[idx(x, y)]!;
          const base = 15 + v.climate - 2.4 * (H - 1 - y);
          const d = T - base;
          if (Math.abs(d) < 2) continue;
          const a = Math.min(0.2, Math.abs(d) / 80);
          const col = d > 0 ? '255,150,80' : '90,150,255';
          const wash = ctx.createRadialGradient((x + 0.5) * cx, (y + 0.5) * cy, 0, (x + 0.5) * cx, (y + 0.5) * cy, cx * 1.1);
          wash.addColorStop(0, `rgba(${col},${a.toFixed(3)})`);
          wash.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = wash;
          ctx.fillRect((x - 0.6) * cx, (y - 0.6) * cy, cx * 2.2, cy * 2.2);
        }

      // rainbows (behind the cloud and rain)
      for (const b of rainbows(v)) {
        const seen = b.seen;
        const lo = Math.min(...seen) * cx;
        const hi = (Math.max(...seen) + 1) * cx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(lo - cx * 0.5, 0, hi - lo + cx, ch);
        ctx.clip();
        RAINBOW.forEach((c, k) => {
          ctx.beginPath();
          ctx.strokeStyle = c;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = cx * 0.16;
          const rad = (b.r - k * 0.16) * cx;
          ctx.arc(b.cx * cx, ch * 0.92, Math.max(2, rad), Math.PI, 0);
          ctx.stroke();
        });
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // clouds: puffy blobs, a grey underside when heavy, white on top
      for (const pass of [0, 1])
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const c = v.cloud[idx(x, y)]!;
            if (c < 0.05) continue;
            const heavy = Math.min(1, c / 1.2);
            const rad = cx * (0.62 + Math.min(0.7, c * 0.45));
            const px = (x + 0.5) * cx;
            const py = (y + 0.5) * cy + (pass === 0 ? cy * 0.18 : 0);
            const a = Math.min(0.96, 0.3 + c * 0.6);
            const tone = pass === 0 ? Math.round(200 - heavy * 70) : Math.round(255 - heavy * 40);
            const grad = ctx.createRadialGradient(px, py, rad * 0.35, px, py, rad);
            grad.addColorStop(0, `rgba(${tone},${tone},${tone + 10},${(pass === 0 ? a * 0.8 : a).toFixed(3)})`);
            grad.addColorStop(1, `rgba(${tone},${tone},${tone + 10},0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, rad, 0, Math.PI * 2);
            ctx.fill();
          }

      // rain and snow, falling from the cloud base to the ground
      for (let x = 0; x < W; x++) {
        let base = -1;
        for (let y = 0; y < groundTop(x); y++) if (v.cloud[idx(x, y)]! > 0.4) base = y;
        if (base < 0) continue;
        const rain = v.rain[x]!;
        const snow = v.snowfall[x]!;
        if (rain > 0.002 && rnd() < Math.min(0.9, rain * 40)) parts.emit('rain', (x + rnd()) * cx, (base + 1) * cy, 1, rnd, 0.3);
        if (snow > 0.001 && rnd() < Math.min(0.7, snow * 60)) parts.emit('snow', (x + rnd()) * cx, (base + 1) * cy, 1, rnd, 0.5);
      }
      const wind = v.wind.reduce((a, b) => a + b, 0) / (W * H);
      parts.step(dt * (reduced ? 0.6 : 1) * (cw / 600), wind * 4);
      parts.items = parts.items.filter((p) => {
        const col = Math.floor(p.x / cx);
        return col >= 0 && col < W && p.y < groundTop(col) * cy;
      });
      parts.draw(ctx);

      // fog on the low ground
      for (let x = 0; x < W; x++) {
        const f = v.fog[x]!;
        if (f < 0.05) continue;
        const y = groundTop(x) * cy;
        const grad = ctx.createLinearGradient(0, y - cy * 1.6, 0, y);
        grad.addColorStop(0, 'rgba(240,240,248,0)');
        grad.addColorStop(1, `rgba(240,240,248,${(f * 0.85).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x * cx - 2, y - cy * 1.6, cx + 4, cy * 1.6);
      }

      // lightning: a quick zigzag (a slow glow with reduced motion)
      if (v.strikes.length !== lastStrikes) {
        const s = v.strikes[v.strikes.length - 1];
        if (s) flash = { x: s.x, age: 0 };
        lastStrikes = v.strikes.length;
      }
      if (flash) {
        flash.age += dt;
        const life = reduced ? 900 : 320;
        const k = 1 - flash.age / life;
        if (k <= 0) flash = null;
        else if (reduced) {
          ctx.fillStyle = `rgba(255,230,120,${(k * 0.35).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc((flash.x + 0.5) * cx, groundTop(flash.x) * cy - cy, cx * 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          let top = 0;
          for (let y = 0; y < groundTop(flash.x); y++)
            if (columnCloud(v, flash.x) > 0 && v.cloud[idx(flash.x, y)]! > 0.3) {
              top = y;
              break;
            }
          ctx.strokeStyle = `rgba(255,240,150,${k.toFixed(3)})`;
          ctx.lineWidth = Math.max(2, cx * 0.12);
          ctx.beginPath();
          let px = (flash.x + 0.5) * cx;
          let py = top * cy;
          ctx.moveTo(px, py);
          const end = groundTop(flash.x) * cy;
          while (py < end) {
            py = Math.min(end, py + cy * 0.7);
            px += (rnd() - 0.5) * cx * 0.8;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
    });
  }, [reduced, valleyRef]);
  return <canvas ref={ref} className="valley-canvas" aria-hidden="true" />;
}
