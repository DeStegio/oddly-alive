import { useKeepsakes } from './keepsakes';

describe('keepsakes store', () => {
  beforeEach(() => useKeepsakes.getState().reset());

  it('keeps personal bests and says when one is new', () => {
    const k = useKeepsakes.getState();
    expect(k.record('bestRally', 3)).toBe(true);
    expect(useKeepsakes.getState().record('bestRally', 2)).toBe(false);
    expect(useKeepsakes.getState().record('bestRally', 5)).toBe(true);
    expect(useKeepsakes.getState().records.bestRally).toBe(5);
  });

  it('writes diary lines, once when asked, and caps the diary', () => {
    const k = useKeepsakes.getState();
    k.note('first-visit', 'hello', { once: true });
    useKeepsakes.getState().note('first-visit', 'again', { once: true });
    expect(useKeepsakes.getState().diary).toHaveLength(1);
    for (let i = 0; i < 60; i++) useKeepsakes.getState().note('n', String(i));
    expect(useKeepsakes.getState().diary).toHaveLength(40);
  });

  it('tidying the world clears the beds and the dress-up, not the story', () => {
    const k = useKeepsakes.getState();
    k.setPlot(0, { kind: 'mint', plantedAt: 1, updatedAt: 1, wateredAt: 0, growth: 0.5 });
    useKeepsakes.getState().addLetter('living');
    useKeepsakes.getState().addHat('beret');
    useKeepsakes.getState().seeWeather('rain', 5);
    useKeepsakes.getState().tidy();
    const s = useKeepsakes.getState();
    expect(s.garden.plots[0]).toBeNull();
    expect(s.attic.hats).toEqual([]);
    expect(s.letters).toEqual(['living']);
    expect(s.almanac).toEqual({ rain: 5 });
    expect(useKeepsakes.getState().addLetter('living')).toBe(false);
    expect(useKeepsakes.getState().seeWeather('rain')).toBe(false);
  });
});
