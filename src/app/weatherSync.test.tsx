import { render } from '@testing-library/react';
import { act } from 'react';
import { allBehaviors } from '../behaviors';
import { WeatherLayer } from '../components/WeatherLayer';
import { ActorChannel } from '../engine/actors';
import { ManualClock } from '../engine/clock';
import { PIN_MS } from '../engine/weather';
import { World } from '../engine/world';
import { useKeepsakes } from '../state/keepsakes';
import { getWorldState, initialWorldState, setWorldState } from '../state/worldStore';
import { pinWeather, startWeather, unpinWeather } from './weatherSync';

describe('house weather sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    setWorldState(initialWorldState());
    useKeepsakes.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  function setup() {
    const world = new World({ clock: new ManualClock(), actors: new ActorChannel(), seed: 1, behaviors: allBehaviors() });
    const seen: string[] = [];
    world.bus.on('WEATHER_CHANGED', (e) => seen.push(`${e.payload.from}>${e.payload.to}${e.payload.pinned ? '*' : ''}`));
    const stop = startWeather(world);
    return { world, seen, stop };
  }

  it('follows the mood, tells the world and fills the almanac', () => {
    const { seen, stop } = setup();
    expect(getWorldState().weather).toBe('clear');
    expect(document.documentElement.dataset.weather).toBe('clear');
    setWorldState({ mood: 'annoyed' });
    expect(getWorldState().weather).toBe('storm');
    expect(seen).toEqual(['clear>storm']);
    expect(Object.keys(useKeepsakes.getState().almanac).sort()).toEqual(['clear', 'storm']);
    stop();
    expect(document.documentElement.dataset.weather).toBeUndefined();
  });

  it('a pin holds for three minutes, then the mood takes over again', () => {
    const { seen, stop } = setup();
    setWorldState({ mood: 'playful' });
    pinWeather('rain');
    expect(getWorldState().weather).toBe('rain');
    vi.advanceTimersByTime(PIN_MS - 2000);
    expect(getWorldState().weather).toBe('rain');
    vi.advanceTimersByTime(3000);
    expect(getWorldState().weather).toBe('sunny');
    expect(getWorldState().weatherPin).toBeNull();
    expect(seen).toEqual(['clear>sunny', 'sunny>rain*', 'rain>sunny']);
    pinWeather('snow');
    unpinWeather();
    expect(getWorldState().weather).toBe('sunny');
    stop();
  });

  it('the weather layer draws the current weather, with capped particles', () => {
    setWorldState({ weather: 'rain' });
    const { container } = render(<WeatherLayer />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.dataset.weather).toBe('rain');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.querySelectorAll('span').length).toBe(26);
    act(() => setWorldState({ weather: 'fog' }));
    expect(layer.dataset.weather).toBe('fog');
    expect(layer.querySelectorAll('span').length).toBe(0);
    const { container: ambient } = render(<WeatherLayer variant="ambient" weather="snow" />);
    expect(ambient.querySelectorAll('span').length).toBe(10);
  });
});
