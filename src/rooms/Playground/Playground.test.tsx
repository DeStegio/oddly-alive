import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { allBehaviors } from '../../behaviors';
import { ActorChannel } from '../../engine/actors';
import { ManualClock } from '../../engine/clock';
import { World } from '../../engine/world';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import Playground from './Playground';
import { defaultLayout } from './physics';
import { decodeArrangement, encodeArrangement } from './share';

describe('playground share encoding', () => {
  it('round-trips an arrangement and maps between orientations', () => {
    const land = defaultLayout(false);
    const code = encodeArrangement(land.arrangement, false);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = decodeArrangement(code, land)!;
    expect(back.map((s) => s.kind)).toEqual(land.arrangement.map((s) => s.kind));
    const portrait = decodeArrangement(code, defaultLayout(true))!;
    for (const s of portrait) expect(s.x).toBeLessThanOrEqual(600);
  });

  it('rejects malformed or hostile input', () => {
    const land = defaultLayout(false);
    expect(decodeArrangement('!!!', land)).toBeNull();
    expect(decodeArrangement(btoa('x.1,2,3,4'), land)).toBeNull();
    expect(decodeArrangement(btoa('l.99,2,3,4'), land)).toBeNull();
    expect(decodeArrangement(btoa('l.1,NaN,3,4'), land)).toBeNull();
    // the key can never be shared into someone else's playground
    expect(decodeArrangement(btoa('l.6,100,100,0'), land)).toBeNull();
    const huge = decodeArrangement(btoa('l.' + Array.from({ length: 80 }, () => '0,100,100,0').join(';')), land)!;
    expect(huge.length).toBeLessThanOrEqual(24);
    const clamped = decodeArrangement(btoa('l.0,99999,-500,0'), land)!;
    expect(clamped[0]!.x).toBeLessThanOrEqual(land.width);
    expect(clamped[0]!.y).toBeGreaterThanOrEqual(0);
  });

  it('never encodes the key', () => {
    const code = encodeArrangement([{ kind: 'key', x: 1, y: 1 }, { kind: 'ball', x: 2, y: 2 }], false);
    expect(atob(code.replace(/-/g, '+').replace(/_/g, '/'))).toBe('l.0,2,2,0');
  });
});

describe('<Playground />', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
  });

  it('spawns shapes, caps them, and resets to the opening arrangement', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Playground />
      </MemoryRouter>,
    );
    const start = defaultLayout(window.innerWidth < 720).arrangement.length;
    expect(screen.getByRole('status')).toHaveTextContent(`${start} things on the floor.`);
    fireEvent.click(screen.getByRole('button', { name: 'Drop a ball' }));
    expect(screen.getByRole('status')).toHaveTextContent(`${start + 1} things`);
    for (let i = 0; i < 30; i++) fireEvent.click(screen.getByRole('button', { name: 'Drop a pebble' }));
    expect(screen.getByRole('status')).toHaveTextContent(/floor is full/);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('status')).toHaveTextContent(`${start} things on the floor.`);
  });

  it('shapes are keyboard operable', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Playground />
      </MemoryRouter>,
    );
    const ball = screen.getByRole('button', { name: /bouncy coral ball/ });
    fireEvent.keyDown(ball, { key: 'ArrowUp' });
    fireEvent.click(ball, { detail: 0 });
    expect(getWorldState().counts['shape:ball']).toBe(1);
  });

  it('shows the golden key only after the keyhole has been found', () => {
    useObjects.getState().setLiving({ keyholeRevealed: true });
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Playground />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /golden key/ })).toBeInTheDocument();
  });
});

describe('playground behaviors', () => {
  it('Dot comments on a fast throw, a tower and a reset', () => {
    setWorldState(initialWorldState());
    const actors = new ActorChannel();
    actors.subscribe('dot', () => {});
    const world = new World({ clock: new ManualClock(), actors, seed: 3, behaviors: allBehaviors() });
    world.enterRoom('playground');
    world.emit('OBJECT_DRAGGED', { target: 'shape:ball', phase: 'end', speed: 3, distance: 300 });
    world.emit('OBJECT_STATE_CHANGED', { target: 'playground', key: 'tower', value: 5 });
    const ids = world.scheduler.log.map((l) => l.id);
    expect(ids).toContain('pg.throw.fast');
    expect(ids).toContain('pg.tower');
    expect(actors.history.filter((h) => h.id === 'dot' && h.cmd.type === 'say').length).toBeGreaterThan(0);
  });
});
