import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { allBehaviors } from '../../behaviors';
import { Controls } from '../../components/Controls';
import { ActorChannel } from '../../engine/actors';
import { ManualClock } from '../../engine/clock';
import { World } from '../../engine/world';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import AfterHours from './AfterHours';
import { constellationName, largestGroup } from './sky';

const router = (ui: React.ReactNode) => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>;

describe('sky logic', () => {
  it('measures the largest connected group of stars', () => {
    expect(largestGroup([])).toBe(0);
    expect(largestGroup([[0, 1]])).toBe(2);
    expect(largestGroup([[0, 1], [1, 2], [5, 6], [2, 3]])).toBe(4);
  });
  it('names constellations deterministically', () => {
    const links = [[0, 1], [1, 2]] as const;
    expect(constellationName(links)).toBe(constellationName(links));
  });
});

describe('<AfterHours />', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useSettings.getState().hydrate({ afterHours: false });
  });

  it('connecting five stars by keyboard draws a constellation', () => {
    render(router(<AfterHours />));
    const star = (n: number) => screen.getAllByRole('button').find((b) => /^Star (\d+)/.exec(b.getAttribute('aria-label') ?? '')?.[1] === String(n))!;
    for (const n of [1, 2, 3, 4, 5]) fireEvent.click(star(n), { detail: 0 });
    expect(screen.getByText(/You drew “/)).toBeInTheDocument();
    expect(useObjects.getState().after.constellations).toBe(1);
  });

  it('the porch light and radio are real toggles', () => {
    render(router(<AfterHours />));
    fireEvent.click(screen.getByRole('button', { name: /Porch light/ }));
    expect(useObjects.getState().after.lightOn).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Radio/ }));
    expect(screen.getByRole('button', { name: /Radio/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('After Hours is a manual switch, never clock-gated', () => {
    render(router(<Controls />));
    const btn = screen.getByRole('button', { name: 'After Hours off' });
    fireEvent.click(btn);
    expect(useSettings.getState().afterHours).toBe(true);
    expect(screen.getByRole('button', { name: 'After Hours on' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('night behaviors', () => {
  function setup() {
    setWorldState(initialWorldState());
    const actors = new ActorChannel();
    for (const id of ['pim', 'moth', 'lumen'] as const) actors.subscribe(id, () => {});
    const world = new World({ clock: new ManualClock(), actors, seed: 4, behaviors: allBehaviors() });
    world.enterRoom('after-hours');
    return { world, actors };
  }

  it('a light after hours brings the moth (secret)', () => {
    const { world } = setup();
    world.emit('OBJECT_STATE_CHANGED', { target: 'porchlight', key: 'on', value: true });
    expect(getWorldState().discoveries.moth).toBeDefined();
  });

  it('a constellation is a secret and Pim names it', () => {
    const { world, actors } = setup();
    world.emit('OBJECT_STATE_CHANGED', { target: 'sky', key: 'constellation', value: 'The Great Sofa' });
    expect(getWorldState().discoveries.constellation).toBeDefined();
    expect(actors.history.some((h) => h.cmd.type === 'say' && h.cmd.text.includes('The Great Sofa'))).toBe(true);
  });

  it('switching to night nudges the house toward mischief', () => {
    const { world } = setup();
    const before = world.personality.vars.mischief;
    world.emit('OBJECT_STATE_CHANGED', { target: 'settings', key: 'afterHours', value: true });
    expect(world.personality.vars.mischief).toBeGreaterThan(before);
  });
});
