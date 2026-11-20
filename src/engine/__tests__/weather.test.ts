import { MOODS } from '../types';
import { PIN_MS, WEATHERS, WEATHER_FOR_MOOD, isWeather, makePin, resolveWeather } from '../weather';

describe('house weather', () => {
  it('follows the mood when nothing is pinned', () => {
    for (const m of MOODS) expect(resolveWeather(m, null, 0)).toBe(WEATHER_FOR_MOOD[m]);
    expect(resolveWeather('annoyed', null, 0)).toBe('storm');
    expect(resolveWeather('sleepy', null, 0)).toBe('night');
  });

  it('a pin wins until it runs out', () => {
    const pin = makePin('rain', 1000);
    expect(pin.until).toBe(1000 + PIN_MS);
    expect(resolveWeather('playful', pin, 1000 + PIN_MS - 1)).toBe('rain');
    expect(resolveWeather('playful', pin, 1000 + PIN_MS)).toBe('sunny');
  });

  it('rain and snow can only be pinned, never moods', () => {
    const fromMoods = new Set(Object.values(WEATHER_FOR_MOOD));
    expect(fromMoods.has('rain')).toBe(false);
    expect(fromMoods.has('snow')).toBe(false);
    for (const w of fromMoods) expect(WEATHERS).toContain(w);
  });

  it('recognises weather ids', () => {
    expect(isWeather('fog')).toBe(true);
    expect(isWeather('hail')).toBe(false);
    expect(isWeather(3)).toBe(false);
  });
});
