import { TURNS, glassClosed, initialButton, step, type ButtonInput, type ButtonState } from './buttonMachine';

const run = (s: ButtonState, ...inputs: ButtonInput[]) => {
  const outcomes: string[] = [];
  for (const i of inputs) {
    const r = step(s, i);
    s = r.state;
    outcomes.push(r.outcome);
  }
  return { s, outcomes };
};
const press = (now: number, rng = 0.9): ButtonInput => ({ type: 'press', now, rng });
const tick = (now: number, idleMs = 0): ButtonInput => ({ type: 'tick', now, idleMs });

/** Three quick presses from calm: the brackets come out, then the glass. */
function shielded(now = 1000) {
  const { s } = run(initialButton(0), press(now), press(now + 300), press(now + 600), tick(now + 2000));
  return s;
}

describe('the button that fights back', () => {
  it('starts cooperative: a gentle press just works', () => {
    const { s, outcomes } = run(initialButton(0), press(1000));
    expect(outcomes).toEqual(['pressed']);
    expect(s.mode).toBe('calm');
    expect(s.presses).toBe(1);
  });

  it('gentle presses, spaced out, never make it defensive (and build trust)', () => {
    let s = initialButton(0);
    const trust0 = s.trust;
    for (let i = 1; i <= 12; i++) s = step(s, press(i * 5000)).state;
    expect(s.mode === 'calm' || s.mode === 'wary').toBe(true);
    expect(s.presses).toBe(12);
    expect(s.trust).toBeGreaterThan(trust0);
  });

  it('impatience escalates: wary, then bracing, then the glass', () => {
    const { s, outcomes } = run(initialButton(0), press(1000), press(1300), press(1600));
    expect(outcomes).toEqual(['pressed', 'pressed', 'bracing']);
    expect(s.mode).toBe('bracing');
    const after = step(s, tick(3000));
    expect(after.outcome).toBe('shielded');
    expect(glassClosed(after.state)).toBe(true);
  });

  it('the closed glass blocks presses', () => {
    const s = shielded();
    const r = step(s, press(3500));
    expect(r.outcome).toBe('blocked');
    expect(r.state.presses).toBe(s.presses);
  });

  it('lifting the glass too soon: it slaps it back. After calming down: it lets you', () => {
    const s = shielded();
    const soon = run(s, { type: 'lift', now: 2600, amount: 0.9 }, { type: 'letGo', now: 2700 });
    expect(soon.outcomes[1]).toBe('snapped');
    expect(soon.s.mode).toBe('shielded');
    // give it a while (irritation fades), then lift again
    const later = run(soon.s, { type: 'lift', now: 14_000, amount: 0.9 }, { type: 'letGo', now: 14_100 });
    expect(later.outcomes[1]).toBe('opened');
    expect(later.s.mode).toBe('open');
    expect(later.s.trust).toBeGreaterThan(soon.s.trust);
    expect(step(later.s, press(14_500)).outcome).toBe('pressed');
  });

  it('loosening both bolts drops the glass; it hides, then repairs itself', () => {
    const s = shielded();
    const turns: ButtonInput[] = [];
    for (let i = 0; i < TURNS; i++) turns.push({ type: 'turnBolt', now: 3000 + i, bolt: 0 }, { type: 'turnBolt', now: 3100 + i, bolt: 1 });
    const loose = run(s, ...turns);
    expect(loose.outcomes.at(-1)).toBe('fell');
    expect(loose.s.mode).toBe('hiding');
    const back = run(loose.s, tick(7000), tick(9500));
    expect(back.s.mode).toBe('shielded');
    expect(back.outcomes).toContain('repaired');
    // and it is more suspicious now: it'll defend sooner next time
    expect(back.s.suspicion).toBeGreaterThan(s.suspicion);
  });

  it('pressing it while it hides works, but costs trust (a different ending)', () => {
    const s = shielded();
    const turns: ButtonInput[] = [];
    for (let i = 0; i < TURNS; i++) turns.push({ type: 'turnBolt', now: 3000 + i, bolt: 0 }, { type: 'turnBolt', now: 3100 + i, bolt: 1 });
    const loose = run(s, ...turns).s;
    const r = step(loose, press(4000));
    expect(r.outcome).toBe('caught');
    expect(r.state.mode).toBe('calm');
    expect(r.state.trust).toBeLessThan(loose.trust);
  });

  it('waiting it out: it lowers the glass by itself', () => {
    const s = shielded();
    const r = run(s, tick(40_000, 20_000), tick(41_500, 21_500));
    expect(r.outcomes).toEqual(['lowered', 'calmed']);
    expect(r.s.mode).toBe('calm');
  });

  it('Dot can pry it open; Tick puts it back', () => {
    const s = shielded();
    const pried = step(s, { type: 'pry', now: 3000 });
    expect(pried.outcome).toBe('pried');
    expect(pried.state.mode).toBe('open');
    const back = step(pried.state, { type: 'putBack', now: 4000 });
    expect(back.outcome).toBe('repaired');
    expect(back.state.mode).toBe('shielded');
  });

  it('the same impatience gets a faster defence once it is suspicious', () => {
    const trusting = run(initialButton(0, 0.6), press(1000), press(1300), press(1600)).outcomes;
    const wary = { ...initialButton(0, 0.2), suspicion: 1 };
    const suspicious = run(wary, press(1000), press(1300)).outcomes;
    expect(trusting.at(-1)).toBe('pressed');
    expect(suspicious.at(-1)).toBe('bracing');
  });
});
