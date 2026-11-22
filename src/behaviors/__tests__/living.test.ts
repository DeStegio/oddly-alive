import { allBehaviors } from '..';
import { ActorChannel } from '../../engine/actors';
import { ManualClock } from '../../engine/clock';
import { World } from '../../engine/world';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';

function setup() {
  setWorldState(initialWorldState());
  useObjects.getState().resetObjects();
  const clock = new ManualClock();
  const actors = new ActorChannel();
  for (const id of ['pim', 'dot', 'tick', 'lumen', 'ferdinand', 'button', 'picture', 'title', 'inch', 'bunny'] as const) {
    actors.subscribe(id, () => {});
  }
  const world = new World({ clock, actors, seed: 42, behaviors: allBehaviors() });
  world.enterRoom('living');
  const fired = () => world.scheduler.log.map((l) => `${l.id}:${l.result}`);
  const said = (id: string) => actors.history.filter((h) => h.id === id && h.cmd.type === 'say').length;
  const click = (target: string) => world.emit('OBJECT_CLICKED', { target, repeat: 1, via: 'pointer' });
  const advance = (ms: number) => {
    for (let t = 0; t < ms; t += 250) {
      clock.advance(250);
      world.tick();
    }
  };
  return { world, clock, actors, fired, said, click, advance };
}

describe('living room behaviors', () => {
  it('a shy (low-trust) Pim hides when clicked; trusted Pim is happy', () => {
    const { world, click, fired } = setup();
    click('pim');
    expect(fired().some((f) => f.startsWith('pim.click.'))).toBe(true);
    world.personality = { ...world.personality, vars: { ...world.personality.vars, trust: 0.9 } };
    const before = fired().length;
    click('pim');
    expect(fired().slice(before).some((f) => f.startsWith('pim.click.shy'))).toBe(false);
  });

  it('too many clicks on Pim makes it suspicious (INT-021)', () => {
    const { click, fired, advance } = setup();
    for (let i = 0; i < 6; i++) {
      click('pim');
      advance(250);
    }
    expect(fired()).toContain('pim.click.suspicious:preempted');
  });

  it('five presses of the button set off a chain reaction and a discovery', () => {
    const { world, fired, advance } = setup();
    const press = () => {
      useObjects.getState().setLiving((s) => ({ buttonPresses: s.buttonPresses + 1 }));
      world.emit('OBJECT_CLICKED', { target: 'button', repeat: 1, via: 'pointer' });
      advance(2500);
    };
    for (let i = 0; i < 4; i++) press();
    expect(fired().some((f) => f.startsWith('button.chain'))).toBe(false);
    press(); // presses = 5
    expect(fired().some((f) => f.startsWith('button.chain'))).toBe(true);
    expect(getWorldState().discoveries.button).toBeDefined();
  });

  it('nudging the picture enough reveals the keyhole (INT-025) and grows the plant', () => {
    const { world, fired } = setup();
    for (let i = 0; i < 4; i++) {
      useObjects.getState().setLiving((s) => ({ pictureNudges: s.pictureNudges + 1 }));
      world.emit('OBJECT_CLICKED', { target: 'picture', repeat: i + 1, via: 'pointer' });
    }
    expect(useObjects.getState().living.keyholeRevealed).toBe(true);
    expect(getWorldState().discoveries.keyhole).toBeDefined();
    expect(fired()).toContain('plant.grow:started');
  });

  it('the picture swings back after a while (INT-053)', () => {
    const { world, advance } = setup();
    useObjects.getState().setLiving({ pictureTilt: 8 });
    world.emit('OBJECT_CLICKED', { target: 'picture', repeat: 1, via: 'pointer' });
    advance(5500);
    expect(useObjects.getState().living.pictureTilt).toBe(-3);
  });

  it('Tick refuses the first click, then cooperates (INT-023)', () => {
    const { click, fired } = setup();
    click('tick');
    expect(fired()).toContain('tick.refuse:started');
    expect(useObjects.getState().living.clockSpins).toBe(0);
    click('tick');
    expect(useObjects.getState().living.clockSpins).toBe(1);
  });

  it('typing hello greets everyone and records a discovery (INT-042)', () => {
    const { world, said } = setup();
    world.emit('KEY_SEQUENCE_DETECTED', { sequence: 'hello' });
    expect(said('pim')).toBeGreaterThan(0);
    expect(getWorldState().discoveries.hello).toBeDefined();
  });

  it('circling Pim three times makes it dizzy and is a secret (INT-015)', () => {
    const { world, fired } = setup();
    world.emit('POINTER_CIRCLED', { target: 'pim', turns: 3 });
    expect(fired()).toContain('pim.circled:started');
    expect(getWorldState().discoveries.circles).toBeDefined();
  });

  it('turning the lamp off startles Pim (INT-019 chain)', () => {
    const { world, fired, actors } = setup();
    world.emit('OBJECT_STATE_CHANGED', { target: 'lumen', key: 'on', value: false });
    expect(fired().some((f) => f.startsWith('chain.dark'))).toBe(true);
    expect(actors.history.some((h) => h.id === 'dot' && h.cmd.type === 'anim' && h.cmd.name === 'hide')).toBe(true);
  });

  it('Dot zoomies rearrange the room, which relaxes back on its own (INT-029)', () => {
    const { click, advance } = setup();
    for (let i = 0; i < 6; i++) {
      click('dot');
      advance(250);
    }
    expect(useObjects.getState().living.rearranged).toBe(true);
    advance(31_000);
    expect(useObjects.getState().living.rearranged).toBe(false);
  });

  it('typed title letters get poked (INT-041); other keys do not', () => {
    const { world, actors } = setup();
    world.emit('KEY_PRESSED', { key: 'o' });
    world.emit('KEY_PRESSED', { key: 'z' });
    const pokes = actors.history.filter((h) => h.id === 'title' && h.cmd.type === 'poke');
    expect(pokes).toHaveLength(1);
  });

  it('returning to the room changes the greeting (INT-035)', () => {
    const { world, advance, said } = setup();
    world.enterRoom('mood');
    world.enterRoom('living');
    advance(1000);
    expect(said('pim')).toBeGreaterThan(0);
  });

  it('room-scoped behaviors stay silent in other rooms', () => {
    const { world, fired } = setup();
    world.enterRoom('memory');
    world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' });
    expect(fired().some((f) => f.startsWith('pim.click'))).toBe(false);
  });
});
