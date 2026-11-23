/**
 * One tiny canvas particle helper (dust, pollen, rain, snow, sparks) with a
 * hard cap. Pure state + a draw function, so rooms can step it on the shared
 * frame loop and tests can step it without a canvas.
 */
export const MAX_PARTICLES = 160;

export type ParticleKind = 'dust' | 'pollen' | 'rain' | 'snow' | 'spark';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

const GRAVITY: Record<ParticleKind, number> = { dust: -0.004, pollen: 0.002, rain: 0.06, snow: 0.004, spark: 0.03 };
const COLOUR: Record<ParticleKind, string> = { dust: 'rgba(214,200,170,', pollen: 'rgba(245,216,115,', rain: 'rgba(120,150,230,', snow: 'rgba(255,255,255,', spark: 'rgba(255,214,90,' };

export class Particles {
  items: Particle[] = [];
  constructor(private cap = MAX_PARTICLES) {}

  /** Adds up to `n` particles; never beyond the cap (oldest go first). */
  emit(kind: ParticleKind, x: number, y: number, n: number, rnd: () => number = Math.random, spread = 1) {
    for (let i = 0; i < n; i++) {
      if (this.items.length >= this.cap) this.items.shift();
      const max = kind === 'rain' ? 700 : kind === 'spark' ? 450 : 1600 + rnd() * 900;
      this.items.push({
        kind,
        x: x + (rnd() - 0.5) * 10 * spread,
        y: y + (rnd() - 0.5) * 6 * spread,
        vx: (rnd() - 0.5) * (kind === 'spark' ? 0.4 : 0.08) * spread,
        vy: kind === 'rain' ? 0.5 : kind === 'spark' ? -0.2 - rnd() * 0.2 : (rnd() - 0.6) * 0.06,
        life: 0,
        max,
        size: kind === 'rain' ? 1.5 : kind === 'snow' ? 2 + rnd() * 1.5 : 1 + rnd() * 1.8,
      });
    }
  }

  step(dt: number, wind = 0) {
    for (const p of this.items) {
      p.life += dt;
      p.vy += GRAVITY[p.kind] * dt * 0.06;
      p.x += (p.vx + wind * (p.kind === 'rain' ? 0.3 : 1)) * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      if (p.kind === 'snow' || p.kind === 'pollen' || p.kind === 'dust') p.x += Math.sin((p.life + p.y) / 300) * 0.04 * dt * 0.06;
    }
    this.items = this.items.filter((p) => p.life < p.max);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.items) {
      const a = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = `${COLOUR[p.kind]}${(a * 0.9).toFixed(2)})`;
      if (p.kind === 'rain') ctx.fillRect(p.x, p.y, 1.4, 7);
      else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  clear() {
    this.items = [];
  }
}
