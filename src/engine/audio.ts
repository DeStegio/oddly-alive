import type { ActorId, Mood } from './types';

/**
 * Opt-in, fully synthesized sound. Nothing is created until the visitor turns
 * sound on (a user gesture), nothing autoplays, and every sound is short and
 * quiet. No audio files, so nothing licensed.
 */
type Ctx = AudioContext;

const VOICE: Partial<Record<ActorId, { base: number; wave: OscillatorType }>> = {
  pim: { base: 520, wave: 'sine' },
  dot: { base: 880, wave: 'triangle' },
  lumen: { base: 330, wave: 'square' },
  tick: { base: 260, wave: 'triangle' },
  ferdinand: { base: 440, wave: 'sine' },
  nimbus: { base: 620, wave: 'sine' },
  moth: { base: 1040, wave: 'sine' },
  inch: { base: 700, wave: 'triangle' },
  visitor: { base: 700, wave: 'triangle' },
  aunt: { base: 300, wave: 'sawtooth' },
  button: { base: 200, wave: 'square' },
  picture: { base: 300, wave: 'sawtooth' },
  room: { base: 240, wave: 'sine' },
};

const MOOD_NOTES: Record<Mood, [number, number]> = {
  neutral: [440, 440],
  curious: [440, 587],
  playful: [523, 659],
  shy: [392, 349],
  annoyed: [233, 220],
  excited: [523, 784],
  sleepy: [349, 262],
  mischievous: [415, 554],
  confused: [466, 415],
  affectionate: [392, 523],
};

const LULLABY = [523, 659, 784, 659, 587, 523, 494, 523, 392, 440, 494, 523];

export class AudioManager {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private lastPlay = new Map<string, number>();
  private lullabyTimer: number | null = null;

  get isEnabled() {
    return this.enabled;
  }

  /** Must be called from a user gesture the first time. */
  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      this.stopLullaby();
      void this.ctx?.suspend();
      return;
    }
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  suspend(hidden: boolean) {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else if (this.enabled) void this.ctx.resume();
  }

  private ready(): Ctx | null {
    return this.enabled && this.ctx && this.master && this.ctx.state !== 'closed' ? this.ctx : null;
  }

  /** Rate-limit so bursts (collisions, chains) never pile up. */
  private throttle(key: string, ms: number) {
    const now = performance.now();
    if (now - (this.lastPlay.get(key) ?? 0) < ms) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  private tone(freq: number, start: number, dur: number, opts: { wave?: OscillatorType; gain?: number; slideTo?: number } = {}) {
    const ctx = this.ready();
    if (!ctx || !this.master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.wave ?? 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
    const peak = opts.gain ?? 0.5;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, gain = 0.25) {
    const ctx = this.ready();
    if (!ctx || !this.master) return;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    g.gain.value = gain;
    src.buffer = buf;
    src.connect(f).connect(g).connect(this.master);
    src.start(start);
  }

  /** A named effect. Unknown names are ignored. */
  play(name: string) {
    const ctx = this.ready();
    if (!ctx || !this.throttle(name, name === 'pop' ? 90 : 60)) return;
    const t = ctx.currentTime + 0.01;
    // a single note by frequency (the hand-spun gramophone): 'note:523'
    if (name.startsWith('note:')) {
      const f = Number(name.slice(5));
      if (Number.isFinite(f) && f > 40 && f < 4000) this.tone(f, t, 0.32, { wave: 'triangle', gain: 0.18 });
      return;
    }
    switch (name) {
      case 'pop':
        return this.tone(600 + Math.random() * 300, t, 0.08, { wave: 'triangle', gain: 0.3, slideTo: 300 });
      case 'thud':
        return this.tone(160, t, 0.18, { wave: 'sine', gain: 0.6, slideTo: 60 });
      case 'switchOn':
        this.tone(1200, t, 0.03, { wave: 'square', gain: 0.15 });
        return this.tone(660, t + 0.03, 0.12, { gain: 0.25 });
      case 'switchOff':
        this.tone(900, t, 0.03, { wave: 'square', gain: 0.15 });
        return this.tone(330, t + 0.03, 0.14, { gain: 0.25 });
      case 'press':
        return this.tone(220, t, 0.12, { wave: 'square', gain: 0.2, slideTo: 140 });
      case 'chain':
        return [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, t + i * 0.09, 0.16, { wave: 'triangle', gain: 0.3 }));
      case 'beat':
        return this.tone(110, t, 0.12, { wave: 'sine', gain: 0.6, slideTo: 55 });
      case 'shake':
        return this.noise(t, 0.35, 0.3);
      case 'star':
        return this.tone(1320 + Math.random() * 400, t, 0.4, { gain: 0.18 });
      case 'chime':
        return [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, t + i * 0.08, 0.5, { gain: 0.22 }));
      case 'obj-tea':
        return this.tone(500, t, 0.5, { gain: 0.2, slideTo: 420 });
      case 'obj-horn':
        this.tone(440, t, 0.25, { wave: 'sawtooth', gain: 0.25 });
        return this.tone(554, t + 0.12, 0.3, { wave: 'sawtooth', gain: 0.25 });
      case 'obj-blanket':
        return this.noise(t, 0.5, 0.12);
      case 'obj-mirror':
        return [1046, 1318, 1567].forEach((f, i) => this.tone(f, t + i * 0.05, 0.6, { gain: 0.12 }));
      case 'obj-feather':
        return [880, 988, 880, 1046].forEach((f, i) => this.tone(f, t + i * 0.06, 0.08, { wave: 'triangle', gain: 0.2 }));
      case 'obj-letter':
        return this.tone(523, t, 0.6, { gain: 0.2, slideTo: 659 });
      case 'waltz': {
        // the attic gramophone: a short, original tune in three-four
        const beat = 0.42;
        const melody = [523, 659, 784, 659, 784, 1046, 988, 784, 659, 587, 698, 880, 784, 659, 523, 587, 494, 523];
        const bass = [131, 131, 147, 147, 131, 98];
        melody.forEach((f, i) => this.tone(f, t + i * beat, beat * 0.95, { wave: 'triangle', gain: 0.16 }));
        bass.forEach((f, i) => this.tone(f, t + i * beat * 3, beat * 0.9, { gain: 0.22 }));
        return;
      }
      default:
        return;
    }
  }

  /** Character "speech": a few soft blips pitched per character. */
  voice(actor: ActorId, text: string) {
    const ctx = this.ready();
    const v = VOICE[actor];
    if (!ctx || !v || !this.throttle(`voice:${actor}`, 400)) return;
    const n = Math.min(5, Math.max(2, Math.round(text.length / 9)));
    const t = ctx.currentTime + 0.01;
    for (let i = 0; i < n; i++) {
      const wobble = 1 + ((text.charCodeAt(i * 3) || 0) % 7) / 20;
      this.tone(v.base * wobble, t + i * 0.07, 0.06, { wave: v.wave, gain: v.wave === 'square' || v.wave === 'sawtooth' ? 0.08 : 0.18 });
    }
  }

  mood(m: Mood) {
    const ctx = this.ready();
    if (!ctx || !this.throttle('mood', 2500)) return;
    const [a, b] = MOOD_NOTES[m];
    const t = ctx.currentTime + 0.01;
    this.tone(a, t, 0.35, { gain: 0.1 });
    this.tone(b, t + 0.18, 0.45, { gain: 0.1 });
  }

  startLullaby() {
    if (this.lullabyTimer !== null || !this.ready()) return;
    let i = 0;
    const step = () => {
      const ctx = this.ready();
      if (!ctx) return this.stopLullaby();
      const f = LULLABY[i++ % LULLABY.length] as number;
      this.tone(f, ctx.currentTime + 0.01, 0.7, { gain: 0.12 });
      if (i % 4 === 1) this.tone(f / 2, ctx.currentTime + 0.01, 1.4, { gain: 0.08 });
    };
    step();
    this.lullabyTimer = window.setInterval(step, 520);
  }

  stopLullaby() {
    if (this.lullabyTimer !== null) window.clearInterval(this.lullabyTimer);
    this.lullabyTimer = null;
  }
}

export const audio = new AudioManager();
