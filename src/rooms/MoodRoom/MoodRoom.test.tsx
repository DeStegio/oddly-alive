import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { allBehaviors } from '../../behaviors';
import { forecast } from '../../content/forecast';
import { ActorChannel } from '../../engine/actors';
import { ManualClock } from '../../engine/clock';
import { BASELINE } from '../../engine/personality';
import { World } from '../../engine/world';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import MoodRoom from './MoodRoom';

function setup() {
  setWorldState(initialWorldState());
  useObjects.getState().resetObjects();
  const clock = new ManualClock();
  const actors = new ActorChannel();
  for (const id of ['nimbus', 'pim', 'dot', 'tick', 'ferdinand'] as const) actors.subscribe(id, () => {});
  const world = new World({ clock, actors, seed: 9, behaviors: allBehaviors() });
  world.enterRoom('mood');
  const use = (id: string) => {
    world.emit('OBJECT_CLICKED', { target: `mood:${id}`, repeat: 1, via: 'pointer' });
    world.emit('OBJECT_STATE_CHANGED', { target: `mood:${id}`, key: 'use', value: true });
  };
  const advance = (ms: number) => {
    for (let t = 0; t < ms; t += 500) {
      clock.advance(500);
      world.tick();
    }
  };
  const fired = () => world.scheduler.log.map((l) => l.id);
  return { world, use, advance, fired };
}

describe('mood room behaviors', () => {
  it('tea then blanket puts Nimbus down for a nap (combination, INT-092)', () => {
    const { use, advance } = setup();
    use('tea');
    advance(1000);
    use('blanket');
    expect(useObjects.getState().mood.napping).toBe(true);
    expect(getWorldState().discoveries.nap).toBeDefined();
    advance(26_000);
    expect(useObjects.getState().mood.napping).toBe(false);
  });

  it('the third mirror look makes the reflection wink', () => {
    const { use, fired } = setup();
    use('mirror');
    use('mirror');
    use('mirror');
    expect(fired()).toContain('mood.mirror.wink');
    expect(getWorldState().discoveries.mirror).toBeDefined();
  });

  it('the party horn changes the house mood, which carries into the Living Room (INT-080)', () => {
    const { world, use, advance } = setup();
    advance(4500);
    use('horn');
    use('horn');
    advance(1000);
    expect(['excited', 'playful']).toContain(getWorldState().mood);
    world.enterRoom('living');
    expect(['excited', 'playful']).toContain(getWorldState().mood);
  });

  it('tooting at an annoyed cloud gets a different answer (INT-072)', () => {
    const { world, use, fired } = setup();
    world.personality = { ...world.personality, mood: 'annoyed' };
    use('horn');
    expect(fired()).toContain('mood.horn.annoyed');
    expect(fired()).not.toContain('mood.horn');
  });

  it('seeing six kinds of weather is a secret', () => {
    const { world } = setup();
    setWorldState({ moodsSeen: ['neutral', 'curious', 'playful', 'excited', 'sleepy', 'shy'] });
    world.emit('MOOD_CHANGED', { from: 'shy', to: 'curious' });
    expect(getWorldState().discoveries.moodswing).toBeDefined();
  });

  it('the forecast is words, not numbers', () => {
    const text = forecast('curious', BASELINE);
    expect(text).toMatch(/^Forecast: curious, with a chance of [a-z -]+\.$/);
    expect(text).not.toMatch(/\d/);
  });
});

describe('<MoodRoom />', () => {
  it('renders the window, Nimbus and six windowsill objects', () => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MoodRoom />
      </MemoryRouter>,
    );
    const sill = screen.getByRole('list', { name: 'Things on the windowsill' });
    expect(sill.querySelectorAll('button')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: /Pour some tea/ }));
    expect(useObjects.getState().mood.lastUsed).toBe('tea');
    expect(screen.getByRole('button', { name: /Nimbus the cloud/ })).toBeInTheDocument();
  });
});
