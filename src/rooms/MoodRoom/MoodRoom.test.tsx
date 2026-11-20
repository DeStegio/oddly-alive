import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { allBehaviors } from '../../behaviors';
import { forecast } from '../../content/forecast';
import { ActorChannel } from '../../engine/actors';
import { ManualClock } from '../../engine/clock';
import { BASELINE } from '../../engine/personality';
import { World } from '../../engine/world';
import { useKeepsakes } from '../../state/keepsakes';
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

describe('<MoodRoom /> barometer, almanac and visits', () => {
  const renderRoom = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MoodRoom />
      </MemoryRouter>,
    );
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
  });

  it('pins the house weather and lets it go again', () => {
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: 'rain' }));
    expect(getWorldState().weatherPin?.weather).toBe('rain');
    expect(screen.getByRole('button', { name: 'rain' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Pinned to rain/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'let the mood decide' }));
    expect(getWorldState().weatherPin).toBeNull();
  });

  it('a grumpy house says no once, then gives in', () => {
    setWorldState({ mood: 'annoyed' });
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: 'snow' }));
    expect(getWorldState().weatherPin).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'snow' }));
    expect(getWorldState().weatherPin?.weather).toBe('snow');
  });

  it('sends Nimbus on a visit (a discovery) and empties the window meanwhile', () => {
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: 'to the Living Room' }));
    expect(getWorldState().nimbusVisit?.room).toBe('living');
    expect(getWorldState().discoveries['indoor-weather']).toBeDefined();
    expect(screen.queryByRole('button', { name: /Nimbus the cloud/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'to the Playground' })).toBeDisabled();
  });

  it('the almanac shows the weather seen so far', () => {
    useKeepsakes.getState().seeWeather('rain', Date.UTC(2026, 10, 20, 9, 14));
    renderRoom();
    const almanac = screen.getByRole('region', { name: 'Nimbus’s almanac' });
    expect(almanac).toHaveTextContent('1 of 9 kinds of weather');
    expect(almanac).toHaveTextContent('Steady from the west');
    expect(almanac.querySelectorAll('li[data-seen="false"]')).toHaveLength(8);
  });
});
