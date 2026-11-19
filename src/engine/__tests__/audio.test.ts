import { AudioManager } from '../audio';

class FakeParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = 'sine';
  buffer: unknown = null;
  connect(n: unknown) {
    return n;
  }
  start() {}
  stop() {}
}
let created = 0;
class FakeAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = new FakeNode();
  createOscillator() {
    created++;
    return new FakeNode();
  }
  createGain() {
    return new FakeNode();
  }
  createBiquadFilter() {
    return new FakeNode();
  }
  createDynamicsCompressor() {
    return new FakeNode();
  }
  createBufferSource() {
    return new FakeNode();
  }
  createBuffer(_c: number, len: number) {
    return { getChannelData: () => new Float32Array(len) };
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
}

describe('audio manager', () => {
  beforeEach(() => {
    created = 0;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  });

  it('is silent until enabled — no context, no oscillators', () => {
    const a = new AudioManager();
    a.play('pop');
    a.voice('pim', 'hello there');
    expect(created).toBe(0);
    expect(a.isEnabled).toBe(false);
  });

  it('plays when enabled and throttles bursts', () => {
    const a = new AudioManager();
    a.setEnabled(true);
    a.play('thud');
    const after1 = created;
    expect(after1).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) a.play('thud');
    expect(created).toBe(after1);
    a.setEnabled(false);
    a.play('chime');
    expect(created).toBe(after1);
  });

  it('degrades gracefully without Web Audio', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = undefined;
    const a = new AudioManager();
    expect(() => {
      a.setEnabled(true);
      a.play('pop');
      a.startLullaby();
      a.stopLullaby();
    }).not.toThrow();
  });
});
