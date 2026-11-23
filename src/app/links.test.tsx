import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { allBehaviors } from '../behaviors';
import { MEMORY_KEY, MemoryManager, cleanWorld, emptyMemory } from '../engine/memory';
import { ActorChannel } from '../engine/actors';
import { ManualClock } from '../engine/clock';
import { World } from '../engine/world';
import Attic from '../rooms/Attic/Attic';
import Garden, { resetGardenSession } from '../rooms/Garden/Garden';
import { actOn, makeValley, stepValley } from '../rooms/Weather/sim/valley';
import { useKeepsakes } from '../state/keepsakes';
import { useObjects } from '../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../state/worldStore';
import { publish } from './valley';
import { startWeather } from './weatherSync';

/**
 * Phase 4 cross-room links (all optional, all additive): valley rain fills
 * the Garden's barrel; the Garden's hybrids put a pressed flower in the
 * attic; the house weather is whatever the valley is doing. And the memory
 * that carries them: v3, additive, old saves load.
 */
const wrap = (ui: React.ReactNode) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

describe('cross-room links', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
    resetGardenSession();
  });

  it('rain on the valley’s field fills the garden barrel, a little, capped', () => {
    let v = actOn(makeValley(), { type: 'nimbus', x: 8, squeezing: true });
    for (let i = 0; i < 200; i++) v = stepValley(v);
    expect(v.fieldRain).toBeGreaterThan(1.5);
    publish(v);
    expect(useKeepsakes.getState().garden2.barrel).toBeGreaterThan(0);
    publish({ ...v, fieldRain: 100 });
    expect(useKeepsakes.getState().garden2.barrel).toBe(3);
  });

  it('the garden uses the valley’s rain as extra barrel tips (never needed: job 1 has none)', () => {
    useKeepsakes.getState().addBarrel(2);
    wrap(<Garden />);
    expect(screen.getByRole('button', { name: /The rain barrel, 2 tips left/ })).toBeInTheDocument();
    expect(useKeepsakes.getState().garden2.barrel).toBe(0);
  });

  it('the valley is the house weather; a calm valley lets the mood decide', () => {
    const world = new World({ clock: new ManualClock(), actors: new ActorChannel(), seed: 1, behaviors: allBehaviors() });
    const stop = startWeather(world);
    setWorldState({ mood: 'annoyed' });
    expect(getWorldState().weather).toBe('storm');
    setWorldState({ valleyWeather: 'rain' });
    expect(getWorldState().weather).toBe('rain');
    setWorldState({ valleyWeather: null });
    expect(getWorldState().weather).toBe('storm');
    stop();
  });

  it('a hybrid from the garden puts a pressed flower in the attic (an optional second clue)', () => {
    useKeepsakes.getState().learnRule('hybrid:mint:sunflower');
    // the act-1 things have to be on the board to stay locked
    useKeepsakes.getState().setBoard({
      found: ['hat-block', 'feather-tin', 'pin-cushion', 'radio-valve', 'headphones'],
      pins: { 'hat-block': 'odile:1920', 'feather-tin': 'odile:1930', 'pin-cushion': 'odile:1920', 'radio-valve': 'walter:1940', headphones: 'walter:1950' },
      locked: ['hat-block', 'feather-tin', 'pin-cushion', 'radio-valve', 'headphones'],
      act: 2,
      scenes: [],
    });
    wrap(<Attic />);
    for (let i = 0; i < 40; i++) fireEvent.click(screen.getByRole('button', { name: 'Dust the next thing' }));
    expect(useKeepsakes.getState().board.found).toContain('pressed-flower');
  });
});

describe('memory: phase 4 is additive inside v3', () => {
  it('a Phase 3 save (no garden2 / workshop / board) loads unchanged, with empty new sections', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as unknown as Storage;
    const old = { ...emptyMemory(1000), visits: 4, discoveries: { keyhole: 5 }, world: { letters: ['living'], story: { 'incident-sofa': 9 }, button: { trust: 0.6, suspicion: 0.1 } } };
    store.set(MEMORY_KEY, JSON.stringify(old));
    const { data, status } = new MemoryManager(storage).load(2000);
    expect(status).toBe('restored');
    expect(data.visits).toBe(4);
    expect(data.world.letters).toEqual(['living']);
    expect(data.world.button.trust).toBe(0.6);
    expect(data.world.garden2).toEqual({ solved: [], herbarium: [], barrel: 0 });
    expect(data.world.workshop).toEqual({ solved: [], sandbox: '' });
    expect(data.world.board).toEqual({ found: [], pins: {}, locked: [], scenes: [], act: 1 });
    expect(data.settings.hints).toBe(true);
  });

  it('junk in the new sections is dropped, and caps hold', () => {
    const w = cleanWorld({
      garden2: { solved: ['facing', '<script>', 42], herbarium: ['sun-face'], barrel: 99 },
      workshop: { solved: ['a-cloud'], sandbox: 'drop table; <img>' },
      board: { found: ['hat-block', 'x y'], pins: { 'hat-block': 'odile:1920', 'feather-tin': 'nope', 'Bad Key': 'odile:1920', 'pin-cushion': ':1920' }, locked: ['hat-block'], scenes: [], act: 7 },
    });
    expect(w.garden2.solved).toEqual(['facing']);
    expect(w.garden2.barrel).toBe(3);
    expect(w.workshop.sandbox).toBe('');
    expect(w.board.pins).toEqual({ 'hat-block': 'odile:1920', 'pin-cushion': ':1920' });
    expect(w.board.act).toBe(1);
  });

  it('the sandbox valley survives a save and load', async () => {
    const { saveValley, loadValley } = await import('../rooms/Weather/sim/read');
    let v = actOn(makeValley({ climate: -4 }), { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 });
    for (let i = 0; i < 50; i++) v = stepValley(v);
    const text = saveValley(v);
    expect(text.length).toBeLessThanOrEqual(6000);
    expect(cleanWorld({ workshop: { solved: [], sandbox: text } }).workshop.sandbox).toBe(text);
    const back = loadValley(text)!;
    expect(back.tools.map((t) => t.id)).toEqual(['teacup']);
    expect(back.cloud.reduce((a, b) => a + b, 0)).toBeCloseTo(v.cloud.reduce((a, b) => a + b, 0), 0);
    expect(loadValley('v1|nonsense')).toBeNull();
  });
});
